import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import { getInternalExclusion } from "@/lib/api/internal-exclusion";
import prisma from "@/lib/prisma";
import { withStatementTimeout } from "@/lib/db/with-timeout";
import {
  getTotalAvgPageDuration,
  getTotalDocumentDuration,
} from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/datarooms/:id/documents/:documentId/stats
    let session;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (sessionError) {
      console.error("Session error:", sessionError);
      return res.status(401).end("Unauthorized");
    }
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: dataroomId,
      documentId,
      excludeTeamMembers,
    } = req.query as {
      teamId: string;
      id: string;
      documentId: string;
      excludeTeamMembers?: string;
    };

    const userId = (session.user as CustomUser).id;

    try {
      // Check if the user is part of the team
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId: userId,
            },
          },
        },
      });

      if (!team) {
        return res.status(401).end("Unauthorized");
      }

      // Verify the document exists in the dataroom
      const dataroomDocument = await prisma.dataroomDocument.findFirst({
        where: {
          dataroomId,
          document: {
            id: documentId,
            teamId,
          },
        },
        include: {
          document: {
            include: {
              versions: {
                take: 1,
                where: {
                  isPrimary: true,
                },
                select: {
                  versionNumber: true,
                  numPages: true,
                },
              },
              team: {
                select: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      if (!dataroomDocument) {
        return res.status(404).json({
          error: "Document not found in this dataroom",
        });
      }

      const { excludedEmails: teamExcludedEmails, excludedLinkIds } =
        await getInternalExclusion(teamId);

      // exclude views from the team's members if requested
      let exclusionEmails: string[] = [];
      if (excludeTeamMembers) {
        const users = await prisma.user.findMany({
          where: { teams: { some: { teamId } } },
          select: { email: true },
        });
        exclusionEmails = [
          ...users
            .map((user) => user.email)
            .filter((email): email is string => Boolean(email)),
          ...teamExcludedEmails,
        ];
      }

      // Get all views for this document that are specifically from the dataroom
      const views = await withStatementTimeout(30000, async (tx) =>
        tx.view.findMany({
          where: {
            documentId: documentId,
            isArchived: false,
            dataroomId: dataroomId,
            ...(exclusionEmails.length > 0
              ? { viewerEmail: { notIn: exclusionEmails } }
              : {}),
          },
          select: {
            id: true,
          },
        }),
      );

      // if there are no views, return an empty array
      if (!views || views.length === 0) {
        return res.status(200).json({
          views: [],
          duration: { data: [] },
          total_duration: 0,
          groupedReactions: [],
          totalViews: 0,
          totalPagesMax: 0,
        });
      }

      const excludedViews = await withStatementTimeout(30000, async (tx) =>
        tx.view.findMany({
          where: {
            documentId: documentId,
            OR: [
              { isArchived: true },
              { dataroomId: { not: dataroomId } },
              ...(exclusionEmails.length > 0
                ? [{ isArchived: false, viewerEmail: { in: exclusionEmails } }]
                : []),
            ],
          },
          select: {
            id: true,
          },
        }),
      );

      const filteredViews = views;

      let duration;
      try {
        duration = await getTotalAvgPageDuration({
          documentId: documentId,
          excludedLinkIds: excludedLinkIds.join(","),
          excludedViewIds: excludedViews.map((view) => view.id).join(","),
          since: 0,
        });
      } catch (durationError) {
        console.error("Tinybird duration error:", durationError);
        duration = { data: [], elapsed: 0, statistics: {} };
      }

      const stats = {
        views: filteredViews,
        duration,
        total_duration: 0, // INFO: hiding this for now
        groupedReactions: [], // INFO: hiding this as not relevant
        totalViews: filteredViews.length,
        completionRate: 0,
        totalPagesMax: dataroomDocument.document.versions[0].numPages,
      };

      return res.status(200).json(stats);
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    // We only allow GET requests
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
