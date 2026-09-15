import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getTeamActivity } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId, users: { some: { userId } } },
      select: { id: true },
    });

    if (!team) {
      return res.status(401).end("Unauthorized");
    }

    const { since, limit } = req.query as {
      since?: string;
      limit?: string;
    };

    try {
      const { data } = await getTeamActivity({
        team_id: teamId,
        since: since ? Number(since) : 0,
        limit: limit ? Number(limit) : 100,
      });
      return res.status(200).json(data);
    } catch (error) {
      log({
        message: `Graceful degradation: team activity feed unavailable for team ${teamId}. \n\n ${error}`,
        type: "error",
      });
      return res.status(200).json([]);
    }
  } catch (error) {
    errorhandler(error, res);
  }
}
