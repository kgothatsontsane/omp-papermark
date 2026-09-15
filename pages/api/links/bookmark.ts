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

  const { linkId, viewId, dataroomId, documentId } = req.body as {
    linkId: string;
    viewId: string;
    dataroomId: string;
    documentId: string;
  };

  if (!linkId || !viewId || !dataroomId || !documentId) {
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
      await prisma.viewerBookmark.upsert({
        where: { viewId_documentId: { viewId, documentId } },
        create: { viewId, dataroomId, documentId },
        update: {},
      });
    } else {
      await prisma.viewerBookmark.deleteMany({ where: { viewId, documentId } });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error updating bookmark" });
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
        event_type: req.method === "POST" ? "bookmark_add" : "bookmark_remove",
        country: meta.country,
        city: meta.city,
        device: meta.device,
        browser: meta.browser,
        os: meta.os,
        ip_address: meta.ip_address,
      }),
      "dataroomNav bookmark",
    );
  }

  return res.status(200).json({ bookmarked: req.method === "POST" });
}
