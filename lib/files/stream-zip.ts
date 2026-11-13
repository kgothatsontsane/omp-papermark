import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getTeamS3ClientAndConfig as getS3 } from "@/lib/files/aws-client";
import { log } from "@/lib/utils";

export type ZipEntry = { key: string; zipPath: string };

export async function streamZipToResponse(
  teamId: string,
  entries: ZipEntry[],
  res: any,
): Promise<void> {
  const { client, config } = await getS3(teamId);

  const archiver = require("archiver");
  const archive = archiver("zip", { zlib: { level: 6 } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="download.zip"');
  res.setHeader("Cache-Control", "no-cache");

  const done = new Promise<void>((resolve, reject) => {
    archive.on("error", (err: Error) => {
      log({ message: `streamZip error: ${err}`, type: "error" });
      reject(err);
    });
    res.on("finish", () => resolve());
    res.on("error", (err: Error) => reject(err));
    res.on("close", () => resolve());
  });

  archive.pipe(res);

  try {
    for (const entry of entries) {
      if (!entry.key || !entry.zipPath) continue;
      const cmd = new GetObjectCommand({
        Bucket: config.bucket,
        Key: entry.key,
      });
      const out = await client.send(cmd);
      const body = out.Body as any;
      if (!body) {
        log({
          message: `streamZip empty body for ${entry.key}`,
          type: "error",
        });
        continue;
      }
      archive.append(body, { name: entry.zipPath });
    }
    archive.finalize();
    await done;
  } catch (err) {
    try {
      archive.abort();
    } catch {
      /* noop */
    }
    throw err;
  }
}
