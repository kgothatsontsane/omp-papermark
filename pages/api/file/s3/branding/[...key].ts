import type { NextApiRequest, NextApiResponse } from "next";

import { getStorageConfig } from "@/ee/features/storage/config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ONE_HOUR, ONE_SECOND } from "@/lib/constants";
import { getS3Client } from "@/lib/files/aws-client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).end("Method Not Allowed");
  }

  const parts = req.query.key;
  if (!Array.isArray(parts) || parts.length < 3) {
    return res.status(400).end("Invalid image key");
  }

  try {
    const key = parts.map(decodeURIComponent).join("/");
    const config = getStorageConfig();
    const url = await getSignedUrl(
      getS3Client(config.region),
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { expiresIn: ONE_HOUR / ONE_SECOND },
    );

    return res.redirect(url);
  } catch {
    return res.status(404).end("Image not found");
  }
}
