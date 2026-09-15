import { NextApiRequest, NextApiResponse } from "next";

import { ViewType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { recordDataroomNav } from "@/lib/tinybird";
import { ingestSafely, metaFromApiRequest } from "@/lib/tracking/request-meta";
import { nanoid } from "@/lib/utils";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { linkId, viewId, dataroomId, listId, documentId } = req.body as {
    linkId: string;
    viewId: string;
    dataroomId: string;
    listId: string;
    documentId: string;
  };

  if (!linkId || !viewId || !dataroomId || !listId || !documentId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const view = await prisma.view.findUnique({
    where: {
      id: viewId,
      linkId: linkId,
      viewType: { equals: ViewType.DATAROOM_VIEW },
    },
    select: { id: true, dataroom: { select: { id: true } } },
  });

  if (!view || !view.dataroom || view.dataroom.id !== dataroomId) {
    return res.status(404).json({ error: "View not found" });
  }

  const list = await prisma.viewerList.findFirst({
    where: { id: listId, viewId },
    select: { id: true },
  });

  if (!list) {
    return res.status(404).json({ error: "List not found" });
  }

  try {
    if (req.method === "POST") {
      await prisma.viewerListItem.upsert({
        where: { listId_documentId: { listId, documentId } },
        create: { listId, documentId },
        update: {},
      });
    } else {
      await prisma.viewerListItem.deleteMany({ where: { listId, documentId } });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error updating list item" });
  }

  const meta = metaFromApiRequest(req);
  if (!meta.isBot) {
    await ingestSafely(
      recordDataroomNav({
        event_id: nanoid(),
        timestamp: Date.now(),
        link_id: linkId,
        view_id: viewId,
        dataroom_id: dataroomId,
        document_id: documentId,
        event_type:
          req.method === "POST" ? "list_item_add" : "list_item_remove",
        list_id: listId,
        country: meta.country,
        city: meta.city,
        device: meta.device,
        browser: meta.browser,
        os: meta.os,
        ip_address: meta.ip_address,
      }),
      "dataroomNav list_item",
    );
  }

  return res.status(200).json({ success: true });
}
