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

  const { linkId, viewId, dataroomId, name, listId } = req.body as {
    linkId: string;
    viewId: string;
    dataroomId: string;
    name?: string;
    listId?: string;
  };

  if (!linkId || !viewId || !dataroomId) {
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

  try {
    if (req.method === "POST") {
      if (listId) {
        if (!name?.trim()) {
          return res.status(400).json({ error: "Missing list name" });
        }
        const updated = await prisma.viewerList.updateMany({
          where: { id: listId, viewId },
          data: { name: name.trim() },
        });
        if (updated.count === 0) {
          return res.status(404).json({ error: "List not found" });
        }
        return res.status(200).json({ id: listId, name: name.trim() });
      }

      if (!name?.trim()) {
        return res.status(400).json({ error: "Missing list name" });
      }
      const list = await prisma.viewerList.create({
        data: { viewId, dataroomId, name: name.trim() },
      });

      const meta = metaFromApiRequest(req);
      if (!meta.isBot) {
        await ingestSafely(
          recordDataroomNav({
            event_id: nanoid(),
            timestamp: Date.now(),
            link_id: linkId,
            view_id: viewId,
            dataroom_id: dataroomId,
            event_type: "list_create",
            list_id: list.id,
            country: meta.country,
            city: meta.city,
            device: meta.device,
            browser: meta.browser,
            os: meta.os,
            ip_address: meta.ip_address,
          }),
          "dataroomNav list_create",
        );
      }

      return res.status(200).json({ id: list.id, name: list.name });
    }

    if (!listId) {
      return res.status(400).json({ error: "Missing list id" });
    }
    await prisma.viewerList.deleteMany({ where: { id: listId, viewId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Error updating list" });
  }
}
