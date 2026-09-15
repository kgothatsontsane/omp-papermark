import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId, users: { some: { userId } } },
      select: { id: true, excludedEmails: true, excludedLinkIds: true },
    });

    if (!team) {
      return res.status(401).end("Unauthorized");
    }

    if (req.method === "GET") {
      return res.status(200).json({
        excludedEmails: team.excludedEmails ?? [],
        excludedLinkIds: team.excludedLinkIds ?? [],
      });
    }

    if (req.method === "POST") {
      const { email, linkId } = req.body as {
        email?: string;
        linkId?: string;
      };
      const data: { excludedEmails?: string[]; excludedLinkIds?: string[] } =
        {};
      if (email && !(team.excludedEmails ?? []).includes(email)) {
        data.excludedEmails = [...(team.excludedEmails ?? []), email];
      }
      if (linkId && !(team.excludedLinkIds ?? []).includes(linkId)) {
        data.excludedLinkIds = [...(team.excludedLinkIds ?? []), linkId];
      }
      if (Object.keys(data).length === 0) {
        return res.status(200).json({
          excludedEmails: team.excludedEmails ?? [],
          excludedLinkIds: team.excludedLinkIds ?? [],
        });
      }
      const updated = await prisma.team.update({
        where: { id: teamId },
        data,
        select: { excludedEmails: true, excludedLinkIds: true },
      });
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const { email, linkId } = req.query as {
        email?: string;
        linkId?: string;
      };
      const updated = await prisma.team.update({
        where: { id: teamId },
        data: {
          ...(email
            ? {
                excludedEmails: (team.excludedEmails ?? []).filter(
                  (e) => e !== email,
                ),
              }
            : {}),
          ...(linkId
            ? {
                excludedLinkIds: (team.excludedLinkIds ?? []).filter(
                  (l) => l !== linkId,
                ),
              }
            : {}),
        },
        select: { excludedEmails: true, excludedLinkIds: true },
      });
      return res.status(200).json(updated);
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    errorhandler(error, res);
  }
}
