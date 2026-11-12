import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser, LinkWithViews } from "@/lib/types";
import { log } from "@/lib/utils";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/datarooms/:id/groups/:groupId/links
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: dataroomId,
      groupId,
    } = req.query as {
      teamId: string;
      id: string;
      groupId: string;
    };
    const userId = (session.user as CustomUser).id;

    try {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId: (session.user as CustomUser).id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!team) {
        return res.status(403).end("Unauthorized to access this team");
      }

      let links = await prisma.link.findMany({
        where: {
          groupId: groupId,
          dataroomId: dataroomId,
          linkType: "DATAROOM_LINK",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          views: {
            where: {
              viewType: "DATAROOM_VIEW",
            },
            orderBy: {
              viewedAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              viewedAt: true,
            },
          },
          customFields: true,
          _count: {
            select: { views: { where: { viewType: "DATAROOM_VIEW" } } },
          },
        },
      });

      let extendedLinks: LinkWithViews[] = links as LinkWithViews[];
      if (extendedLinks && extendedLinks.length > 0) {
        for (const link of extendedLinks) {
          if (link.password !== null) {
            link.password = null;
          }
        }
        const folderIds = Array.from(
          new Set(
            extendedLinks
              .filter((link) => link.enableUpload && link.uploadFolderId !== null)
              .map((link) => link.uploadFolderId as string),
          ),
        );
        const folders =
          folderIds.length > 0
            ? await prisma.dataroomFolder.findMany({
                where: { id: { in: folderIds } },
                select: { id: true, name: true },
              })
            : [];
        const folderMap = new Map(folders.map((folder) => [folder.id, folder.name]));

        const linkIds = extendedLinks.map((link) => link.id);
        const tagItems =
          linkIds.length > 0
            ? await prisma.tagItem.findMany({
                where: { linkId: { in: linkIds }, itemType: "LINK_TAG" },
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
              })
            : [];
        const tagsByLink = new Map<string, typeof tagItems[number]["tag"][]>();
        for (const item of tagItems) {
          if (!item.linkId) continue;
          const arr = tagsByLink.get(item.linkId) ?? [];
          arr.push(item.tag);
          tagsByLink.set(item.linkId, arr);
        }

        extendedLinks = extendedLinks.map((link) => {
          if (link.enableUpload && link.uploadFolderId !== null) {
            link.uploadFolderName = folderMap.get(link.uploadFolderId);
          }
          return {
            ...link,
            tags: tagsByLink.get(link.id) ?? [],
          };
        });
      }

      return res.status(200).json(extendedLinks);
    } catch (error) {
      log({
        message: `Failed to get links for dataroom: _${dataroomId}_,group: _${groupId}_. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, groupId: ${groupId}, userId: ${userId}}\``,
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
