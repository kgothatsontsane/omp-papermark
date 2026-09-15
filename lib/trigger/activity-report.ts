import { logger, task } from "@trigger.dev/sdk/v3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import Bottleneck from "bottleneck";

import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { sendExportReadyEmail } from "@/lib/emails/send-export-ready-email";
import prisma from "@/lib/prisma";
import { jobStore } from "@/lib/redis-job-store";
import {
  getAccessFunnel,
  getDownloadsByDocument,
  getGeoBreakdown,
  getSecurityFlags,
} from "@/lib/tinybird";

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return "NaN";
  }

  const stringField = String(field);

  if (
    stringField.includes(",") ||
    stringField.includes("\n") ||
    stringField.includes("\r") ||
    stringField.includes('"')
  ) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

function createCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",");
}

const tinybirdLimiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

export type ActivityReportPayload = {
  teamId: string;
  dataroomId?: string;
  documentId?: string;
  requestedByEmail: string;
  userId: string;
  exportId: string;
};

export const activityReportTask = task({
  id: "activity-report",
  retry: { maxAttempts: 3 },
  maxDuration: 900,
  run: async (payload: ActivityReportPayload) => {
    const { teamId, dataroomId, documentId, requestedByEmail, userId, exportId } =
      payload;

    logger.info("Starting activity report task", { payload });

    try {
      await jobStore.updateJob(exportId, { status: "PROCESSING" });

      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: { some: { userId } },
        },
        select: { id: true, name: true },
      });

      if (!team) {
        throw new Error("Team not found or access denied");
      }

      const scope = {
        teamId,
        ...(dataroomId ? { dataroomId } : {}),
        ...(documentId ? { documentId } : {}),
      };

      const [views, links, documents] = await Promise.all([
        prisma.view.findMany({
          where: { ...scope, isArchived: false },
          select: {
            id: true,
            viewerEmail: true,
            viewerName: true,
            viewedAt: true,
            downloadedAt: true,
            verified: true,
            linkId: true,
            documentId: true,
            link: { select: { name: true } },
          },
          orderBy: { viewedAt: "desc" },
          take: 500,
        }),
        prisma.link.findMany({
          where: {
            teamId,
            ...(dataroomId ? { dataroomId } : {}),
            ...(documentId ? { documentId } : {}),
          },
          select: { id: true, name: true },
          take: 20,
        }),
        prisma.document.findMany({
          where: {
            teamId,
            ...(documentId ? { id: documentId } : {}),
            ...(dataroomId
              ? { datarooms: { some: { dataroomId } } }
              : {}),
          },
          select: { id: true, name: true },
          take: 20,
        }),
      ]);

      const linkNameById = new Map(links.map((l) => [l.id, l.name ?? l.id]));

      const funnelRows: string[][] = [];
      const geoRows: string[][] = [];
      const securityRows: string[][] = [];
      for (const link of links) {
        const [funnel, geo, flags] = await Promise.all([
          tinybirdLimiter
            .schedule(() =>
              getAccessFunnel({ link_id: link.id, since: 0 }),
            )
            .catch((e) => {
              logger.warn("Access funnel degraded", {
                linkId: link.id,
                error: String(e),
              });
              return null;
            }),
          tinybirdLimiter
            .schedule(() =>
              getGeoBreakdown({ link_id: link.id, since: 0 }),
            )
            .catch((e) => {
              logger.warn("Geo breakdown degraded", {
                linkId: link.id,
                error: String(e),
              });
              return null;
            }),
          tinybirdLimiter
            .schedule(() =>
              getSecurityFlags({ link_id: link.id, since: 0 }),
            )
            .catch((e) => {
              logger.warn("Security flags degraded", {
                linkId: link.id,
                error: String(e),
              });
              return null;
            }),
        ]);
        const linkName = linkNameById.get(link.id) ?? link.id;
        for (const row of funnel?.data ?? []) {
          funnelRows.push([linkName, row.event_type, String(row.event_count)]);
        }
        for (const row of geo?.data ?? []) {
          geoRows.push([
            linkName,
            row.country,
            row.city,
            String(row.view_count),
          ]);
        }
        for (const row of flags?.data ?? []) {
          securityRows.push([
            linkName,
            row.timestamp,
            row.flag_type,
            row.severity,
            row.detail,
          ]);
        }
      }

      const downloadRows: string[][] = [];
      for (const doc of documents) {
        const downloads = await tinybirdLimiter
          .schedule(() =>
            getDownloadsByDocument({ document_id: doc.id, since: 0 }),
          )
          .catch((e) => {
            logger.warn("Downloads by document degraded", {
              documentId: doc.id,
              error: String(e),
            });
            return null;
          });
        for (const row of downloads?.data ?? []) {
          downloadRows.push([
            doc.name,
            String(row.download_count),
            String(row.total_files),
            String(row.total_bytes),
            String(row.viewer_count),
          ]);
        }
      }

      const resourceName =
        documents.length === 1
          ? documents[0].name
          : (await prisma.dataroom
              .findUnique({
                where: { id: dataroomId },
                select: { name: true },
              })
              .catch(() => null))?.name ?? team.name;

      const csvRows: string[] = [];
      csvRows.push(createCsvRow(["Activity report", resourceName]));
      csvRows.push(
        createCsvRow(["Generated at", new Date().toISOString()]),
      );
      csvRows.push(
        createCsvRow(["Total views (max 500)", views.length]),
      );
      csvRows.push("");
      csvRows.push(
        createCsvRow([
          "Viewer email",
          "Viewer name",
          "Viewed at",
          "Downloaded at",
          "Verified",
          "Link",
        ]),
      );
      for (const view of views) {
        csvRows.push(
          createCsvRow([
            view.viewerEmail,
            view.viewerName,
            view.viewedAt.toISOString(),
            view.downloadedAt ? view.downloadedAt.toISOString() : "NaN",
            view.verified ? "Yes" : "No",
            view.link?.name ?? view.linkId,
          ]),
        );
      }
      csvRows.push("");
      csvRows.push(createCsvRow(["Access funnel", "Event", "Count"]));
      for (const row of funnelRows) {
        csvRows.push(createCsvRow(["", ...row]));
      }
      csvRows.push("");
      csvRows.push(createCsvRow(["Geo", "Country", "City", "Views"]));
      for (const row of geoRows) {
        csvRows.push(createCsvRow(["", ...row]));
      }
      csvRows.push("");
      csvRows.push(
        createCsvRow([
          "Downloads",
          "Download count",
          "Files",
          "Bytes",
          "Viewers",
        ]),
      );
      for (const row of downloadRows) {
        csvRows.push(createCsvRow(["", ...row]));
      }
      csvRows.push("");
      csvRows.push(
        createCsvRow(["Security flags", "Timestamp", "Type", "Severity", "Detail"]),
      );
      for (const row of securityRows) {
        csvRows.push(createCsvRow(["", ...row]));
      }

      const csvData = csvRows.join("\n");
      const currentTime = new Date().toISOString().split("T")[0];
      const filename = `activity-${resourceName.replace(/[^a-zA-Z0-9]/g, "_")}-${currentTime}.csv`;
      const key = `${teamId}/exports/${exportId}-${filename}`;
      const { client, config } = await getTeamS3ClientAndConfig(teamId);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: csvData,
          ContentType: "text/csv",
        }),
      );

      logger.info("Activity report uploaded to S3", {
        key,
        size: csvData.length,
      });

      await jobStore.updateJob(exportId, {
        status: "COMPLETED",
        result: `s3:${key}`,
        resourceName,
        completedAt: new Date().toISOString(),
      });

      try {
        await sendExportReadyEmail({
          to: requestedByEmail,
          resourceName: `Activity report for ${resourceName}`,
          downloadUrl: `${process.env.NEXTAUTH_URL}/api/teams/${teamId}/export-jobs/${exportId}?download=true`,
        });
      } catch (error) {
        logger.error("Failed to send activity report email", {
          exportId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        success: true,
        exportId,
        resourceName,
        csvSize: csvData.length,
        s3Key: key,
      };
    } catch (error) {
      logger.error("Activity report task failed", {
        exportId,
        error: error instanceof Error ? error.message : String(error),
      });

      await jobStore.updateJob(exportId, {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});
