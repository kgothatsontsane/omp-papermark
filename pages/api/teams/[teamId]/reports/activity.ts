import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { jobStore } from "@/lib/redis-job-store";
import { activityReportTask } from "@/lib/trigger/activity-report";
import { CustomUser } from "@/lib/types";

export default async function handler(
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

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;
  const userEmail = (session.user as CustomUser).email;
  const { dataroomId, documentId, email } = req.body as {
    dataroomId?: string;
    documentId?: string;
    email?: string;
  };

  if (!dataroomId && !documentId) {
    return res.status(400).json({ message: "dataroomId or documentId required" });
  }

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        users: { some: { userId } },
      },
      select: { plan: true },
    });

    if (!team) {
      return res.status(404).end("Team not found");
    }

    let resourceName: string;
    let type: "document" | "dataroom";
    let resourceId: string;

    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId, teamId },
        select: { id: true, name: true },
      });
      if (!document) {
        return res.status(404).end("Document not found");
      }
      resourceName = document.name;
      type = "document";
      resourceId = document.id;
    } else {
      const dataroom = await prisma.dataroom.findUnique({
        where: { id: dataroomId, teamId },
        select: { id: true, name: true },
      });
      if (!dataroom) {
        return res.status(404).end("Dataroom not found");
      }
      resourceName = dataroom.name;
      type = "dataroom";
      resourceId = dataroom.id;
    }

    const requestedByEmail = email ?? userEmail;
    if (!requestedByEmail) {
      return res.status(400).json({ message: "Requester email required" });
    }

    const exportJob = await jobStore.createJob({
      type,
      resourceId,
      resourceName,
      userId,
      teamId,
      status: "PENDING",
      emailNotification: true,
      emailAddress: requestedByEmail,
    });

    const handle = await activityReportTask.trigger(
      {
        teamId,
        dataroomId,
        documentId,
        requestedByEmail,
        userId,
        exportId: exportJob.id,
      },
      {
        idempotencyKey: exportJob.id,
        tags: [`team_${teamId}`, `user_${userId}`, `report_${exportJob.id}`],
      },
    );

    const updatedJob = await jobStore.updateJob(exportJob.id, {
      triggerRunId: handle.id,
    });

    return res.status(200).json({
      exportId: updatedJob?.id || exportJob.id,
      status: updatedJob?.status || exportJob.status,
      message:
        "Activity report started. You will be notified by email when it's ready.",
    });
  } catch (error) {
    console.error("Error creating activity report:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
