import { logger, schedules } from "@trigger.dev/sdk/v3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { jobStore } from "@/lib/redis-job-store";

export const cleanupExpiredExports = schedules.task({
  id: "cleanup-expired-exports",
  // Run daily at 2 AM UTC
  cron: "0 2 * * *",
  run: async (payload) => {
    logger.info("Starting cleanup of expired export files", {
      timestamp: payload.timestamp,
    });

    try {
      // Get all storage references that are due for cleanup
      const refsToCleanup = await jobStore.getBlobsForCleanup();

      if (refsToCleanup.length === 0) {
        logger.info("No files due for cleanup");
        return { deletedCount: 0 };
      }

      logger.info(`Found ${refsToCleanup.length} files to delete`);

      // Delete files from S3 or Vercel Blob
      const deletionResults = await Promise.allSettled(
        refsToCleanup.map(async (ref) => {
          try {
            if (!ref.blobUrl.startsWith("s3:")) {
              logger.warn("Skipping non-S3 cleanup ref (legacy)", {
                ref: ref.blobUrl,
              });
              await jobStore.removeBlobFromCleanupQueue(
                ref.blobUrl,
                ref.jobId,
              );
              return { ref, success: true };
            }
            const key = ref.blobUrl.slice(3);
            const teamId = key.split("/")[0];
            const { client, config } = await getTeamS3ClientAndConfig(teamId);
            await client.send(
              new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
            );

            // Remove from cleanup queue after successful deletion
            await jobStore.removeBlobFromCleanupQueue(ref.blobUrl, ref.jobId);

            logger.info("Successfully deleted file", {
              ref: ref.blobUrl,
              jobId: ref.jobId,
            });

            return { ref, success: true };
          } catch (error) {
            logger.error("Failed to delete file", {
              ref: ref.blobUrl,
              jobId: ref.jobId,
              error: error instanceof Error ? error.message : String(error),
            });
            return { ref, success: false, error };
          }
        }),
      );

      const successCount = deletionResults.filter(
        (result) => result.status === "fulfilled" && result.value.success,
      ).length;

      const failureCount = deletionResults.length - successCount;

      logger.info("Cleanup completed", {
        totalRefs: refsToCleanup.length,
        successCount,
        failureCount,
      });

      return {
        deletedCount: successCount,
        failureCount,
        totalProcessed: refsToCleanup.length,
      };
    } catch (error) {
      logger.error("Cleanup task failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
