import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getTeamWithUsersAndDocument } from "@/lib/team/helper";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/documents/:id/links
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id: docId } = req.query as { teamId: string; id: string };

    const userId = (session.user as CustomUser).id;

    try {
      const { document } = await getTeamWithUsersAndDocument({
        teamId,
        userId,
        docId,
        checkOwner: true,
        options: {
          select: {
            ownerId: true,
            id: true,
            links: {
              orderBy: {
                createdAt: "desc",
              },
              include: {
                views: {
                  orderBy: {
                    viewedAt: "desc",
                  },
                  select: {
                    id: true,
                    viewedAt: true,
                  },
                  take: 1,
                },
                feedback: {
                  select: {
                    id: true,
                    data: true,
                  },
                },
                customFields: {
                  select: {
                    orderIndex: true,
                    label: true,
                    identifier: true,
                    placeholder: true,
                    type: true,
                    required: true,
                  },
                  orderBy: {
                    orderIndex: "asc",
                  },
                },
                _count: {
                  select: { views: true },
                },
              },
            },
          },
        },
      });

      const rawLinks = document!.links;

      let links = rawLinks;

      if (rawLinks && rawLinks.length > 0) {
        const linkIds = rawLinks.map((link) => link.id);
        const tagItems = await prisma.tagItem.findMany({
          where: {
            linkId: { in: linkIds },
            itemType: "LINK_TAG",
          },
          select: {
            linkId: true,
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        });

        const tagsByLink = new Map<string, { id: string; name: string; color: string; description: string | null }[]>();
        for (const item of tagItems) {
          if (!item.linkId || !item.tag) continue;
          const existing = tagsByLink.get(item.linkId);
          if (existing) {
            existing.push(item.tag);
          } else {
            tagsByLink.set(item.linkId, [item.tag]);
          }
        }

        links = rawLinks.map((link) => {
          if (link.password !== null) {
            link.password = null;
          }
          return {
            ...link,
            tags: tagsByLink.get(link.id) ?? [],
          };
        });
      }

      return res.status(200).json(links);
    } catch (error) {
      log({
        message: `Failed to get links for document: _${docId}_. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, userId: ${userId}}\``,
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
