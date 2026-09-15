import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import DataroomViewerInvitation from "@/components/emails/dataroom-viewer-invitation";
import VerificationLinkEmail from "@/components/emails/verification-link";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { ratelimit } from "@/lib/redis";
import { sendEmail } from "@/lib/resend";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const userId = (session.user as CustomUser).id;
  const senderEmail = (session.user as CustomUser).email;
  const { teamId, id: viewId } = req.query as {
    teamId: string;
    id: string;
  };

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        users: { some: { userId } },
      },
    });

    if (!team) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { success } = await ratelimit(5, "1 m").limit(
        `remind:${userId}:${viewId}`,
      );
      if (!success) {
        return res.status(429).json({ error: "Too many requests" });
      }
    } catch (e) {
      log({
        message: `Remind rate-limit check degraded for view ${viewId}: ${e}`,
        type: "error",
      });
    }

    const view = await prisma.view.findUnique({
      where: { id: viewId, teamId },
      select: {
        id: true,
        viewerEmail: true,
        linkId: true,
        dataroomId: true,
        document: { select: { name: true } },
        dataroom: { select: { name: true } },
      },
    });

    if (!view || !view.viewerEmail) {
      return res.status(404).json({ error: "View not found" });
    }

    const link = await prisma.link.findUnique({
      where: { id: view.linkId },
      select: { id: true, name: true, slug: true },
    });

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    const url = `${process.env.NEXT_PUBLIC_MARKETING_URL}/view/${link.id}?email=${encodeURIComponent(view.viewerEmail)}`;
    const resourceName =
      view.dataroom?.name ?? view.document?.name ?? link.name ?? "document";

    try {
      if (view.dataroomId) {
        await sendEmail({
          to: view.viewerEmail,
          subject: `Reminder: ${resourceName} is waiting for your review`,
          react: DataroomViewerInvitation({
            dataroomName: resourceName,
            senderEmail: senderEmail ?? "",
            url,
          }),
          system: true,
        });
      } else {
        await sendEmail({
          to: view.viewerEmail,
          subject: `Reminder: ${resourceName} is waiting for your review`,
          react: VerificationLinkEmail({ url }),
          system: true,
        });
      }
    } catch (e) {
      log({
        message: `Failed to send reminder for view ${viewId}: ${e}`,
        type: "error",
      });
      return res.status(502).json({ error: "Failed to send reminder" });
    }

    return res.status(200).json({ sent: true });
  } catch (error) {
    errorhandler(error, res);
  }
}
