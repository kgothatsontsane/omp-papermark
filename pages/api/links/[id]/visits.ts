import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { LIMITS } from "@/lib/constants";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { withStatementTimeout } from "@/lib/db/with-timeout";
import { isSelfHostedMode } from "@/lib/self-hosted";
import { getDocumentWithTeamAndUser } from "@/lib/team/helper";
import { getViewPageDuration } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/links/:id/visits
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    // get link id from query params
    const { id } = req.query as { id: string };

    const userId = (session.user as CustomUser).id;

    try {
      // get the numPages from document
      const result = await prisma.link.findUnique({
        where: {
          id: id,
        },
        select: {
          document: {
            select: {
              id: true,
              numPages: true,
              versions: {
                where: { isPrimary: true },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { numPages: true },
              },
              team: {
                select: {
                  id: true,
                  plan: true,
                },
              },
            },
          },
        },
      });

      const docId = result?.document!.id!;

      // check if the the team that own the document has the current user
      await getDocumentWithTeamAndUser({
        docId,
        userId,
        options: {
          team: {
            select: {
              users: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      const numPages =
        result?.document?.versions[0]?.numPages ||
        result?.document?.numPages ||
        0;

      const isFreePlan =
        !isSelfHostedMode() && result?.document?.team?.plan === "free";

      const page = Math.max(
        1,
        parseInt(String(req.query.page ?? "1"), 10) || 1,
      );
      const requestedLimit = Math.max(
        1,
        parseInt(String(req.query.limit ?? "50"), 10) || 50,
      );
      const limit = Math.min(requestedLimit, 200);

      const views = await withStatementTimeout(30000, async (tx) =>
        tx.view.findMany({
          where: {
            linkId: id,
          },
          orderBy: {
            viewedAt: "desc",
          },
          select: {
            id: true,
            viewerEmail: true,
            viewerName: true,
            viewedAt: true,
            downloadedAt: true,
            verified: true,
            linkId: true,
            documentId: true,
            isArchived: true,
            dataroomId: true,
          },
          ...(isFreePlan
            ? { take: LIMITS.views ?? 100 }
            : { skip: (page - 1) * limit, take: limit }),
        }),
      );

      const limitedViews = views;

      const durationsPromises = limitedViews.map((view) => {
        return getViewPageDuration({
          documentId: view.documentId!,
          viewId: view.id,
          since: 0,
        });
      });

      const durationsSettled = await Promise.allSettled(durationsPromises);

      // Sum up durations for each view, treating failures as 0 duration
      const durations = durationsSettled.map((result, index) => {
        if (result.status === "fulfilled") {
          return {
            data: result.value.data || [],
          };
        } else {
          console.error(`View duration error for view ${limitedViews[index].id}:`, result.reason);
          return { data: [] };
        }
      });

      // Sum up durations for each view
      const summedDurations = durations.map((duration) => {
        return duration.data.reduce(
          (totalDuration, data) => totalDuration + data.sum_duration,
          0,
        );
      });

      // Construct the response combining views and their respective durations
      const viewsWithDuration = limitedViews.map((view, index) => {
        // calculate the completion rate
        const completionRate = numPages
          ? (durations[index].data.length / numPages) * 100
          : 0;

        return {
          ...view,
          duration: durations[index],
          totalDuration: summedDurations[index],
          completionRate: completionRate.toFixed(),
        };
      });

      // TODO: Check that the user is owner of the links, otherwise return 401

      res.setHeader(
        "Cache-Control",
        "private, s-maxage=30, stale-while-revalidate=300",
      );
      return res.status(200).json(viewsWithDuration);
    } catch (error) {
      log({
        message: `Failed to get views for link: _${id}_. \n\n ${error} \n\n*Metadata*: \`{userId: ${userId}}\``,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    // We only allow GET requests
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
