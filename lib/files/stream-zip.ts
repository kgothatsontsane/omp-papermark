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

  archive.pipe(res);

  archive.on("error", (err: Error) => {
    log({ message: `streamZip error: ${err}`, type: "error" });
    try {
      res.destroy();
    } catch {
      /* noop */
    }
  });

  for (const entry of entries) {
    if (!entry.key || !entry.zipPath) continue;
    try {
      const cmd = new GetObjectCommand({ Bucket: config.bucket, Key: entry.key });
      const out = await client.send(cmd);
      const body = out.Body as any;
      archive.append(body, { name: entry.zipPath });
    } catch (err) {
      log({ message: `streamZip file fetch failed (${entry.key}): ${err}`, type: "error" });
      archive.abort();
      return;
    }
  }

  await archive.finalize();
}
