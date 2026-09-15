import { NextApiRequest, NextApiResponse } from "next";
import { Webhook } from "svix";

import { nanoid } from "@/lib/utils";
import { recordEmailEvent } from "@/lib/tinybird/publish";
import { ingestSafely } from "@/lib/tracking/request-meta";

export const config = { api: { bodyParser: false } };

const TYPE_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

async function rawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "webhook not configured" });

  const payload = await rawBody(req);
  try {
    new Webhook(secret).verify(payload, {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    });
  } catch {
    return res.status(400).json({ error: "invalid signature" });
  }
  const event = JSON.parse(payload);

  const mapped = TYPE_MAP[event.type];
  if (mapped && event.data?.email_id) {
    const data = event.data;
    void ingestSafely(
      recordEmailEvent({
        event_id: nanoid(),
        timestamp: Date.now(),
        email_id: String(data.email_id),
        event_type: mapped as any,
        recipient: String(data.to ?? data.recipient ?? "unknown"),
        template: (data.tags?.find((t: any) => t.name === "template")?.value as string) ?? null,
        link_id: (data.tags?.find((t: any) => t.name === "link_id")?.value as string) ?? null,
        bounce_type: data.bounce_type ? String(data.bounce_type) : null,
      }),
      `resend webhook ${event.type}`,
    );
  }
  return res.status(200).json({ received: true });
}
