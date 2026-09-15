import { logger, schedules } from "@trigger.dev/sdk/v3";
import Bottleneck from "bottleneck";

import WeeklyDigest from "@/components/emails/weekly-digest";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { getSecurityFlags, getViewPageDuration } from "@/lib/tinybird";

const tinybirdLimiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

export const weeklyDigest = schedules.task({
  id: "weekly-digest",
  // 05:00 UTC every Monday = 07:00 SAST (Africa/Johannesburg, UTC+2).
  // Trigger.dev cron runs in UTC; there is no timezone option on schedules.task.
  cron: "0 5 * * 1",
  run: async (payload) => {
    logger.info("Starting weekly digest", {
      timestamp: payload.timestamp,
    });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const activeTeams = await prisma.view.groupBy({
        by: ["teamId"],
        where: { viewedAt: { gte: weekAgo }, teamId: { not: null } },
        _count: { _all: true },
      });

      logger.info(`Found ${activeTeams.length} teams with weekly activity`);

      for (const entry of activeTeams) {
        if (!entry.teamId) continue;
        const teamId = entry.teamId;
        try {
          await sendTeamDigest(teamId, weekAgo);
        } catch (error) {
          logger.error("Weekly digest failed for team", {
            teamId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { teamCount: activeTeams.length };
    } catch (error) {
      logger.error("Weekly digest task failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

async function sendTeamDigest(teamId: string, weekAgo: Date) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true },
  });
  if (!team) return;

  const [viewerGroups, docGroups, links, unsignedAgreements, admins] =
    await Promise.all([
      prisma.view.groupBy({
        by: ["viewerEmail"],
        where: {
          teamId,
          viewedAt: { gte: weekAgo },
          viewerEmail: { not: null },
        },
        _count: { viewerEmail: true },
        orderBy: { _count: { viewerEmail: "desc" } },
        take: 5,
      }),
      prisma.view.groupBy({
        by: ["documentId"],
        where: {
          teamId,
          viewedAt: { gte: weekAgo },
          documentId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { documentId: "desc" } },
        take: 20,
      }),
      prisma.link.findMany({
        where: { teamId },
        select: { id: true },
        take: 20,
      }),
      prisma.view
        .count({
          where: {
            teamId,
            viewedAt: { gte: weekAgo },
            link: { agreementId: { not: null } },
            agreementResponse: { is: null },
          },
        })
        .catch((e) => {
          logger.warn("Unsigned agreements count degraded", {
            teamId,
            error: String(e),
          });
          return 0;
        }),
      prisma.userTeam.findMany({
        where: { teamId, role: "ADMIN" },
        include: { user: { select: { email: true } } },
      }),
    ]);

  const topViewers = viewerGroups
    .filter((g) => g.viewerEmail)
    .map((g) => ({
      email: g.viewerEmail as string,
      views: g._count.viewerEmail,
    }));

  const dropoffs: { name: string; completion: number }[] = [];
  for (const group of docGroups) {
    if (!group.documentId) continue;
    try {
      const doc = await prisma.document.findUnique({
        where: { id: group.documentId },
        select: { name: true, numPages: true },
      });
      const numPages = doc?.numPages ?? 0;
      if (!doc || numPages === 0) continue;
      const sampleViews = await prisma.view.findMany({
        where: {
          teamId,
          documentId: group.documentId,
          viewedAt: { gte: weekAgo },
        },
        select: { id: true },
        orderBy: { viewedAt: "desc" },
        take: 5,
      });
      const completions = await Promise.all(
        sampleViews.map((v) =>
          tinybirdLimiter
            .schedule(() =>
              getViewPageDuration({
                documentId: group.documentId as string,
                viewId: v.id,
                since: 0,
              }),
            )
            .then((d) => (d.data.length / numPages) * 100)
            .catch(() => null),
        ),
      );
      const valid = completions.filter(
        (c): c is number => typeof c === "number",
      );
      if (valid.length === 0) continue;
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      if (avg < 25) {
        dropoffs.push({ name: doc.name, completion: avg });
      }
    } catch (e) {
      logger.warn("Drop-off computation degraded", {
        teamId,
        documentId: group.documentId,
        error: String(e),
      });
    }
  }
  dropoffs.sort((a, b) => a.completion - b.completion);

  let securityFlagCount = 0;
  await Promise.all(
    links.map((link) =>
      tinybirdLimiter
        .schedule(() => getSecurityFlags({ link_id: link.id, since: 0 }))
        .then((r) => {
          securityFlagCount += r.data.length;
        })
        .catch((e) => {
          logger.warn("Security flags degraded", {
            teamId,
            linkId: link.id,
            error: String(e),
          });
        }),
    ),
  );

  const recipientEmails = admins
    .map((a) => a.user.email)
    .filter((e): e is string => !!e);
  if (recipientEmails.length === 0) {
    logger.info("No admin recipients, skipping digest", { teamId });
    return;
  }

  const weekLabel = `Activity for the week ending ${new Date().toISOString().split("T")[0]}.`;

  for (const to of recipientEmails) {
    try {
      await sendEmail({
        to,
        subject: `Weekly digest: ${team.name}`,
        react: WeeklyDigest({
          teamName: team.name,
          weekLabel,
          topViewers,
          dropoffs: dropoffs.slice(0, 5),
          securityFlagCount,
          unsignedAgreements,
        }),
        system: true,
      });
    } catch (e) {
      logger.error("Failed to send digest email", {
        teamId,
        to,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  logger.info("Weekly digest sent", { teamId, recipients: recipientEmails.length });
}
