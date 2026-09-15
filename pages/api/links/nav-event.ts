import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/lib/prisma";
import { DATAROOM_NAV_EVENT_TYPES, recordDataroomNav } from "@/lib/tinybird";
import { ingestSafely, metaFromApiRequest } from "@/lib/tracking/request-meta";
import { nanoid } from "@/lib/utils";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { linkId, viewId, dataroomId, documentId, folderId, eventType, query, listId } =
    req.body as {
      linkId: string;
      viewId: string;
      dataroomId: string;
      documentId?: string;
      folderId?: string;
      eventType: string;
      query?: string;
      listId?: string;
    };

  if (
    !linkId ||
    !viewId ||
    !dataroomId ||
    !eventType ||
    !(DATAROOM_NAV_EVENT_TYPES as readonly string[]).includes(eventType)
  ) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const view = await prisma.view.findUnique({
    where: { id: viewId, linkId: linkId },
    select: { id: true },
  });

  if (!view) {
    return res.status(404).json({ error: "Not found" });
  }

  const meta = metaFromApiRequest(req);
  if (meta.isBot) {
    return res.status(202).json({ ok: true });
  }

  await ingestSafely(
    recordDataroomNav({
      event_id: nanoid(),
      timestamp: Date.now(),
      link_id: linkId,
      view_id: viewId,
      dataroom_id: dataroomId,
      document_id: documentId ?? null,
      folder_id: folderId ?? null,
      event_type: eventType as (typeof DATAROOM_NAV_EVENT_TYPES)[number],
      query: query ?? null,
      list_id: listId ?? null,
      country: meta.country,
      city: meta.city,
      device: meta.device,
      browser: meta.browser,
      os: meta.os,
      ip_address: meta.ip_address,
    }),
    "dataroomNav",
  );

  return res.status(202).json({ ok: true });
}
