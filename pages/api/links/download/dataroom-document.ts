import { NextApiRequest, NextApiResponse } from "next";

import { ItemType, ViewType } from "@prisma/client";

import { getFile } from "@/lib/files/get-file";
import prisma from "@/lib/prisma";
import { recordDownloadEvent } from "@/lib/tinybird";
import { ingestSafely, metaFromApiRequest } from "@/lib/tracking/request-meta";
import { getFileNameWithPdfExtension, nanoid } from "@/lib/utils";
import { getIpAddress } from "@/lib/utils/ip";
import { Readable } from "stream";

export const config = {
  maxDuration: 180,
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    // POST /api/links/download/dataroom-document
    const { linkId, viewId, documentId } = req.body as {
      linkId: string;
      viewId: string;
      documentId: string;
    };

    try {
      const view = await prisma.view.findUnique({
        where: {
          id: viewId,
          linkId: linkId,
          viewType: { equals: ViewType.DATAROOM_VIEW },
        },
        select: {
          id: true,
          viewedAt: true,
          viewerEmail: true,
          viewerId: true,
          verified: true,
          link: {
            select: {
              allowDownload: true,
              expiresAt: true,
              isArchived: true,
              enableWatermark: true,
              watermarkConfig: true,
              name: true,
              permissionGroupId: true,
            },
          },
          groupId: true,
          dataroom: {
            select: {
              id: true,
              documents: {
                where: { document: { id: documentId } },
                select: {
                  id: true,
                  document: {
                    select: {
                      id: true,
                      name: true,
                      versions: {
                        where: { isPrimary: true },
                        select: {
                          id: true,
                          type: true,
                          file: true,
                          storageType: true,
                          originalFile: true,
                          numPages: true,
                          contentType: true,
                        },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // if view does not exist, we should not allow the download
      if (!view) {
        return res.status(404).json({ error: "Error downloading" });
      }

      // if link does not allow download, we should not allow the download
      if (!view.link.allowDownload) {
        return res.status(403).json({ error: "Error downloading" });
      }

      // if link is archived, we should not allow the download
      if (view.link.isArchived) {
        return res.status(403).json({ error: "Error downloading" });
      }

      // if link is expired, we should not allow the download
      if (view.link.expiresAt && view.link.expiresAt < new Date()) {
        return res.status(403).json({ error: "Error downloading" });
      }

      // if dataroom does not exist, we should not allow the download
      if (!view.dataroom) {
        return res.status(404).json({ error: "Error downloading" });
      }

      // if viewedAt is longer than 23 hours ago, we should not allow the download
      if (
        view.viewedAt &&
        view.viewedAt < new Date(Date.now() - 23 * 60 * 60 * 1000)
      ) {
        return res.status(403).json({ error: "Error downloading" });
      }

      let downloadDocuments = view.dataroom.documents;

      // Check permissions based on groupId (ViewerGroup) or permissionGroupId (PermissionGroup)
      const effectiveGroupId = view.groupId || view.link.permissionGroupId;

      if (effectiveGroupId) {
        let groupPermissions: any[] = [];

        if (view.groupId) {
          // This is a ViewerGroup (legacy behavior)
          groupPermissions = await prisma.viewerGroupAccessControls.findMany({
            where: { groupId: view.groupId, canDownload: true },
          });
        } else if (view.link.permissionGroupId) {
          // This is a PermissionGroup (new behavior)
          groupPermissions =
            await prisma.permissionGroupAccessControls.findMany({
              where: {
                groupId: view.link.permissionGroupId,
                canDownload: true,
              },
            });
        }

        const permittedDocumentIds = groupPermissions
          .filter(
            (permission) => permission.itemType === ItemType.DATAROOM_DOCUMENT,
          )
          .map((permission) => permission.itemId);

        downloadDocuments = downloadDocuments.filter((doc) =>
          permittedDocumentIds.includes(doc.id),
        );
      }

      //creates new view for document
      await prisma.view.create({
        data: {
          viewType: "DOCUMENT_VIEW",
          documentId: documentId,
          linkId: linkId,
          dataroomId: view.dataroom.id,
          groupId: view.groupId,
          dataroomViewId: view.id,
          viewerEmail: view.viewerEmail,
          downloadedAt: new Date(),
          viewerId: view.viewerId,
          verified: view.verified,
        },
      });

      const meta = metaFromApiRequest(req);
      if (!meta.isBot) {
        void ingestSafely(
          recordDownloadEvent({
            event_id: nanoid(),
            timestamp: Date.now(),
            link_id: linkId,
            view_id: viewId,
            document_id: documentId,
            dataroom_id: view.dataroom!.id,
            download_type: "dataroom_doc",
            file_count: 1,
            total_bytes: 0,
            country: meta.country,
            city: meta.city,
            region: meta.region,
            device: meta.device,
            browser: meta.browser,
            os: meta.os,
            ua: meta.ua,
            ip_address: meta.ip_address,
          }),
          "downloadEvent dataroom_doc",
        );
      }

      const file =
        view.link.enableWatermark &&
        downloadDocuments[0].document!.versions[0].type === "pdf"
          ? downloadDocuments[0].document!.versions[0].file
          : (downloadDocuments[0].document!.versions[0].originalFile ??
            downloadDocuments[0].document!.versions[0].file);

      const downloadUrl = await getFile({
        type: downloadDocuments[0].document!.versions[0].storageType,
        data: file,
        isDownload: true,
      });

      // For PDF files with watermark, always buffer and process
      if (
        downloadDocuments[0].document!.versions[0].type === "pdf" &&
        view.link.enableWatermark
      ) {
        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/mupdf/annotate-document`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
            },
            body: JSON.stringify({
              url: downloadUrl,
              numPages: downloadDocuments[0].document!.versions[0].numPages,
              watermarkConfig: view.link.watermarkConfig,
              originalFileName: downloadDocuments[0].document!.name,
              viewerData: {
                email: view.viewerEmail,
                date: new Date(view.viewedAt).toLocaleDateString(),
                ipAddress: getIpAddress(req.headers),
                link: view.link.name,
                time: new Date(view.viewedAt).toLocaleTimeString(),
              },
            }),
          },
        );

        if (!response.ok) {
          return res.status(500).json({ error: "Error downloading" });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(getFileNameWithPdfExtension(downloadDocuments[0].document!.name))}"`,
        );
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          res.setHeader("Content-Length", contentLength);
        }

        if (!response.body) {
          return res.status(500).json({ error: "Error downloading" });
        }

        const stream = Readable.fromWeb(response.body as any);
        stream.pipe(res);
        await new Promise<void>((resolve, reject) => {
          stream.on("end", resolve);
          stream.on("error", reject);
          res.on("error", reject);
        });
        return;
      }

      // For non-watermarked PDFs/images, buffer and set proper headers
      // (direct URL via iframe was unreliable for triggering downloads)
      if (
        downloadDocuments[0].document!.versions[0].contentType ===
          "application/pdf" ||
        (downloadDocuments[0].document!.versions[0].contentType === null &&
          downloadDocuments[0].document!.versions[0].type === "pdf") ||
        downloadDocuments[0].document!.versions[0].contentType?.startsWith(
          "image/",
        )
      ) {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          return res.status(500).json({ error: "Error downloading file" });
        }
        const pdfBuffer = await response.arrayBuffer();
        const contentType =
          downloadDocuments[0].document!.versions[0].contentType ||
          (downloadDocuments[0].document!.versions[0].type === "pdf"
            ? "application/pdf"
            : "application/octet-stream");
        const fileName = downloadDocuments[0].document!.name;
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(fileName)}"`,
        );
        res.setHeader("Content-Length", Buffer.from(pdfBuffer).length);
        res.setHeader("Cache-Control", "no-cache");
        return res.send(Buffer.from(pdfBuffer));
      }

      const headResponse = await fetch(downloadUrl, { method: "HEAD" });
      const contentType =
        downloadDocuments[0].document!.versions[0].contentType ||
        headResponse.headers.get("content-type") ||
        "application/octet-stream";
      const fileName = downloadDocuments[0].document!.name;

      // For all other files, return direct download URL
      return res.status(200).json({
        downloadUrl,
        fileName,
        contentType,
        isDirectDownload: true,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ error: "Error downloading file" });
    }
  } else {
    // We only allow POST requests
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
