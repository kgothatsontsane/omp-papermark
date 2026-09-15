import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getSecurityFlags } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: dataroomId,
      linkId: linkIdParam,
    } = req.query as {
      teamId: string;
      id: string;
      linkId?: string;
    };
    const userId = (session.user as CustomUser).id;

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId, users: { some: { userId } } },
        select: { id: true },
      });
      if (!team) {
        return res.status(401).end("Unauthorized");
      }

      const links = await prisma.link.findMany({
        where: { teamId, dataroomId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });

      const linkId = linkIdParam ?? links[0]?.id ?? null;

      let flags: unknown[] = [];
      if (linkId) {
        try {
          const result = await getSecurityFlags({
            link_id: linkId,
            since: 0,
          });
          flags = result.data;
        } catch (e) {
          console.error("Tinybird security flags error:", e);
        }
      }

      return res.status(200).json({ linkId, links, flags });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
