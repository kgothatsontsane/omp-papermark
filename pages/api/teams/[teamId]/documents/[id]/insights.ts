import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import {
  getAccessFailures,
  getAccessFunnel,
  getDeviceBreakdown,
  getDownloadRate,
  getDownloadsByDocument,
  getDropoffPage,
  getGeoBreakdown,
  getSecurityFlags,
  getVerifyLatency,
  getVideoHeatmap,
  getViewsOverTime,
} from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../../../auth/[...nextauth]";

async function settled<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("Tinybird insights error:", e);
    return fallback;
  }
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id: docId } = req.query as {
      teamId: string;
      id: string;
    };
    const userId = (session.user as CustomUser).id;

    try {
      const document = await prisma.document.findUnique({
        where: { id: docId, teamId },
        select: {
          id: true,
          teamId: true,
          links: {
            select: { id: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

      if (!document) {
        return res.status(404).end("Not Found");
      }

      const membership = await prisma.team.findUnique({
        where: { id: teamId, users: { some: { userId } } },
        select: { id: true },
      });
      if (!membership) {
        return res.status(401).end("Unauthorized");
      }

      const linkId = document.links[0]?.id ?? null;

      const [geo, device, viewsOverTime, dropoff, downloads, rate, funnel, latency, failures, security, heatmap] =
        await Promise.all([
          linkId
            ? settled(
                () =>
                  getGeoBreakdown({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          linkId
            ? settled(
                () =>
                  getDeviceBreakdown({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          linkId
            ? settled(
                () =>
                  getViewsOverTime({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          settled(
            () =>
              getDropoffPage({ document_id: docId, since: 0 }).then(
                (r) => r.data,
              ),
            [],
          ),
          settled(
            () =>
              getDownloadsByDocument({ document_id: docId, since: 0 }).then(
                (r) => r.data[0] ?? null,
              ),
            null,
          ),
          linkId
            ? settled(
                () =>
                  getDownloadRate({ link_id: linkId, since: 0 }).then(
                    (r) => r.data[0] ?? null,
                  ),
                null,
              )
            : Promise.resolve(null),
          linkId
            ? settled(
                () =>
                  getAccessFunnel({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          linkId
            ? settled(
                () =>
                  getVerifyLatency({ link_id: linkId, since: 0 }).then(
                    (r) => r.data[0] ?? null,
                  ),
                null,
              )
            : Promise.resolve(null),
          linkId
            ? settled(
                () =>
                  getAccessFailures({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          linkId
            ? settled(
                () =>
                  getSecurityFlags({ link_id: linkId, since: 0 }).then(
                    (r) => r.data,
                  ),
                [],
              )
            : Promise.resolve([]),
          settled(
            () =>
              getVideoHeatmap({ document_id: docId, since: 0 }).then(
                (r) => r.data,
              ),
            [],
          ),
        ]);

      return res.status(200).json({
        linkId,
        geo,
        device,
        viewsOverTime,
        dropoff,
        downloads,
        downloadRate: rate,
        funnel,
        verifyLatency: latency,
        failures,
        security,
        heatmap,
      });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
