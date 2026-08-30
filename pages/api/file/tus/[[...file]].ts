import type { NextApiRequest, NextApiResponse } from "next";

import { MultiRegionS3Store } from "@/ee/features/storage/s3-store";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import slugify from "@sindresorhus/slugify";
import { Server } from "@tus/server";
import { getServerSession } from "next-auth/next";
import path from "node:path";

import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { RedisLocker } from "@/lib/files/tus-redis-locker";
import { newId } from "@/lib/id-helper";
import { lockerRedisClient } from "@/lib/redis";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ponytail: in-memory lock in local dev (no Upstash round-trips); Redis only
// in production (serverless coordination).
const locker =
  process.env.NODE_ENV === "production" && process.env.UPSTASH_REDIS_REST_LOCKER_URL
    ? new RedisLocker({ redisClient: lockerRedisClient })
    : undefined;

const tusServer = new Server({
  // `path` needs to match the route declared by the next file router
  path: "/api/file/tus",
  maxSize: 1024 * 1024 * 1024 * 2, // 2 GiB
  respectForwardedHeaders: true,
  locker,
  datastore: new MultiRegionS3Store(),
  namingFunction(req, metadata) {
    const { teamId, fileName } = metadata as {
      teamId: string;
      fileName: string;
    };
    const docId = newId("doc");
    const { name, ext } = path.parse(fileName);
    const newName = `${teamId}/${docId}/${slugify(name)}${ext}`;
    return newName;
  },
  generateUrl(req, { proto, host, path, id }) {
    // Encode the ID to be URL safe
    id = Buffer.from(id, "utf-8").toString("base64url");
    return `${proto}://${host}${path}/${id}`;
  },
  getFileIdFromRequest(req) {
    // Extract the ID from the URL
    const id = (req.url as string).split("/api/file/tus/")[1];
    return Buffer.from(id, "base64url").toString("utf-8");
  },
  async onUploadCreate(req, res, upload) {
    // Validate that the session user belongs to the team in the upload metadata
    const metadata = upload.metadata || {};
    const { teamId } = metadata as { teamId?: string };
    if (!teamId) {
      throw { status_code: 400, body: "Missing teamId in upload metadata" };
    }
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      throw { status_code: 401, body: "Unauthorized" };
    }
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId: (session.user as CustomUser).id,
        teamId: teamId,
      },
    });
    if (!userTeam) {
      throw { status_code: 403, body: "Access denied to this team" };
    }
    return res;
  },
  onResponseError(req, res, err) {
    log({
      message: "Error uploading a file. Error: \n\n" + err,
      type: "error",
    });
    return { status_code: 500, body: "Internal Server Error" };
  },
  async onUploadFinish(req, res, upload) {
    try {
      const metadata = upload.metadata || {};
      const contentType = metadata.contentType || "application/octet-stream";
      const { name, ext } = path.parse(metadata.fileName!);
      const contentDisposition = `attachment; filename="${slugify(name)}${ext}"`;

      // The Key (object path) where the file was uploaded
      const objectKey = upload.id;

      // Extract teamId from the object key (format: teamId/docId/filename)
      const teamId = objectKey.split("/")[0];
      if (!teamId) {
        throw { status_code: 500, body: "Invalid object key format" };
      }

      // Get team-specific S3 client and config
      const { client, config } = await getTeamS3ClientAndConfig(teamId);

      // Copy the object onto itself, replacing the metadata.
      // The CopySource must match the physical key. Some setups bake the
      // bucket path into the key (e.g. R2 endpoint .../bucket), so the
      // physical key becomes `<bucket>/<logical-key>`; try both forms.
      const copyCommand = (copySource: string) =>
        new CopyObjectCommand({
          Bucket: config.bucket,
          CopySource: copySource,
          Key: objectKey,
          ContentType: contentType,
          ContentDisposition: contentDisposition,
          MetadataDirective: "REPLACE" as const,
        });

      try {
        await client.send(copyCommand(`${config.bucket}/${objectKey}`));
      } catch (error) {
        await client.send(
          copyCommand(`${config.bucket}/${config.bucket}/${objectKey}`),
        );
      }

      return res;
    } catch (error) {
      throw { status_code: 500, body: "Error updating metadata" };
    }
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get the session
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return tusServer.handle(req, res);
}
