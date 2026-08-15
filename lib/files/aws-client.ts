import {
  type StorageConfig,
  getStorageConfig,
  getTeamStorageConfigById,
} from "@/ee/features/storage/config";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { LambdaClient } from "@aws-sdk/client-lambda";

export const getS3Client = (storageRegion?: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = getStorageConfig(storageRegion);

  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getS3ClientForTeam = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = await getTeamStorageConfigById(teamId);

  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getLambdaClient = (storageRegion?: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = getStorageConfig(storageRegion);

  return new LambdaClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getLambdaClientForTeam = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = await getTeamStorageConfigById(teamId);

  return new LambdaClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

/**
 * Gets both S3 client and storage config for a team in a single call.
 * This is more efficient than calling getS3ClientForTeam and getTeamStorageConfigById separately.
 *
 * @param teamId - The team ID
 * @returns Promise<{ client: S3Client, config: StorageConfig }> - Both client and config
 */
export const getTeamS3ClientAndConfig = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = await getTeamStorageConfigById(teamId);

  const client = new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, config };
};

/**
 * Deletes a file stored under the S3 branding path (served via
 * /api/file/s3/branding/...). Extracts the S3 key from that route URL.
 */
export const deleteBrandingFile = async (brandingUrl: string) => {
  const marker = "/api/file/s3/branding/";
  const idx = brandingUrl.indexOf(marker);
  if (idx === -1) {
    return;
  }
  const key = brandingUrl.slice(idx + marker.length);
  const teamId = key.split("/")[0];
  const { client, config } = await getTeamS3ClientAndConfig(teamId);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
};

/**
 * Uploads a file to the team's S3 bucket under a branding-style key and returns
 * the served route URL (/api/file/s3/branding/{teamId}/{docId}/{file}).
 */
export const uploadBrandingFile = async ({
  teamId,
  docId,
  filename,
  contentType,
  body,
}: {
  teamId: string;
  docId: string;
  filename: string;
  contentType: string;
  body: Buffer;
}) => {
  const { client, config } = await getTeamS3ClientAndConfig(teamId);
  const key = `${teamId}/${docId}/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `/api/file/s3/branding/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
};
