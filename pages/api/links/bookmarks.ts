import { NextApiRequest, NextApiResponse } from "next";

import { ViewType } from "@prisma/client";

import prisma from "@/lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { linkId, viewId } = req.query as {
    linkId: string;
    viewId: string;
  };

  if (!linkId || !viewId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const view = await prisma.view.findUnique({
    where: {
      id: viewId,
      linkId: linkId,
      viewType: { equals: ViewType.DATAROOM_VIEW },
    },
    select: {
      id: true,
      viewerBookmarks: { select: { documentId: true } },
      viewerLists: {
        select: {
          id: true,
          name: true,
          items: { select: { documentId: true } },
        },
      },
    },
  });

  if (!view) {
    return res.status(404).json({ error: "View not found" });
  }

  return res.status(200).json({
    bookmarks: view.viewerBookmarks.map((b) => b.documentId),
    lists: view.viewerLists.map((l) => ({
      id: l.id,
      name: l.name,
      items: l.items.map((i) => i.documentId),
    })),
  });
}
