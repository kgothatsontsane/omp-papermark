import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import { isSelfHostedMode } from "@/lib/self-hosted";
import prisma from "@/lib/prisma";
import { getViewTimeline } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id: docId, viewId } = req.query as {
      teamId: string;
      id: string;
      viewId: string;
    };
    const userId = (session.user as CustomUser).id;

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId, users: { some: { userId } } },
        select: { id: true, plan: true },
      });
      if (!team) {
        return res.status(401).end("Unauthorized");
      }

      if (!isSelfHostedMode() && team.plan.includes("free")) {
        return res.status(403).end("Forbidden");
      }

      const view = await prisma.view.findUnique({
        where: { id: viewId },
        select: { id: true, documentId: true },
      });
      if (!view || (docId && view.documentId !== docId)) {
        return res.status(404).end("Not Found");
      }

      let timeline: unknown[] = [];
      try {
        const result = await getViewTimeline({ view_id: viewId });
        timeline = result.data;
      } catch (e) {
        console.error("Tinybird view timeline error:", e);
      }

      return res.status(200).json(timeline);
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
