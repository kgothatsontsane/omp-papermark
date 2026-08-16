import { logger, retry, task } from "@trigger.dev/sdk/v3";

import { getFile } from "@/lib/files/get-file";
import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";

import { updateStatus } from "../utils/generate-trigger-status";
import { getExtensionFromContentType } from "../utils/get-content-type";
import { convertPdfToImageRoute } from "./pdf-to-image-route";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export type ConvertPayload = {
  documentId: string;
  documentVersionId: string;
  teamId: string;
};

export const convertFilesToPdfTask = task({
  id: "convert-files-to-pdf",
  retry: { maxAttempts: 3 },
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: ConvertPayload) => {
    updateStatus({ progress: 0, text: "Initializing..." });

    const team = await prisma.team.findUnique({
      where: {
        id: payload.teamId,
      },
    });

    if (!team) {
      logger.error("Team not found", { teamId: payload.teamId });
      return;
    }

    const document = await prisma.document.findUnique({
      where: {
        id: payload.documentId,
      },
      select: {
        name: true,
        versions: {
          where: {
            id: payload.documentVersionId,
          },
          select: {
            file: true,
            originalFile: true,
            contentType: true,
            storageType: true,
          },
        },
      },
    });

    if (
      !document ||
      !document.versions[0] ||
      !document.versions[0].originalFile ||
      !document.versions[0].contentType
    ) {
      updateStatus({ progress: 0, text: "Document not found" });

      logger.error("Document not found", {
        documentId: payload.documentId,
        documentVersionId: payload.documentVersionId,
        teamId: payload.teamId,
      });
      return;
    }

    updateStatus({ progress: 10, text: "Retrieving file..." });

    const fileUrl = await getFile({
      data: document.versions[0].originalFile,
      type: document.versions[0].storageType,
    });

    updateStatus({ progress: 20, text: "Converting document..." });

    // Convert locally with LibreOffice (installed in the worker image via aptGet).
    // No external Gotenberg service needed — free, no subscriptions, no cold starts.
    const fileName = document.name;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-convert-"));
    const inputPath = path.join(tmpDir, fileName);
    const outDir = path.join(tmpDir, "out");

    try {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(
          `Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`,
        );
      }
      fs.writeFileSync(inputPath, Buffer.from(await fileResponse.arrayBuffer()));
      fs.mkdirSync(outDir, { recursive: true });

      await execFileAsync(
        "libreoffice",
        ["--headless", "--convert-to", "pdf", "--outdir", outDir, inputPath],
        { timeout: 120_000 },
      );

      const pdfName = fileName.replace(/\.[^.]+$/, "") + ".pdf";
      const outputPath = path.join(outDir, pdfName);
      if (!fs.existsSync(outputPath)) {
        throw new Error("LibreOffice did not produce a PDF output");
      }
      const conversionBuffer = fs.readFileSync(outputPath);
      fs.rmSync(tmpDir, { recursive: true, force: true });

      updateStatus({ progress: 30, text: "Saving converted file..." });

      // get docId from url with starts with "doc_" with regex
      const match = document.versions[0].originalFile.match(/(doc_[^\/]+)\//);
      const docId = match ? match[1] : undefined;

      // Save the converted file to the database
      const { type: storageType, data } = await putFileServer({
        file: {
          name: `${document.name}.pdf`,
          type: "application/pdf",
          buffer: conversionBuffer,
        },
        teamId: payload.teamId,
        docId: docId,
      });

      if (!data || !storageType) {
        updateStatus({ progress: 0, text: "Failed to save converted file" });

        logger.error("Failed to save converted file to database", {
          documentId: payload.documentId,
          documentVersionId: payload.documentVersionId,
          teamId: payload.teamId,
          docId: docId,
        });
        return;
      }

      console.log("data from conversion", data);
      console.log("storageType from conversion", storageType);

      const { versionNumber } = await prisma.documentVersion.update({
        where: { id: payload.documentVersionId },
        data: {
          file: data,
          type: "pdf",
          storageType: storageType,
        },
        select: {
          versionNumber: true,
        },
      });

      updateStatus({ progress: 40, text: "Initiating document processing..." });

      await convertPdfToImageRoute.trigger(
        {
          documentId: payload.documentId,
          documentVersionId: payload.documentVersionId,
          teamId: payload.teamId,
          versionNumber: versionNumber,
        },
        {
          idempotencyKey: `${payload.teamId}-${payload.documentVersionId}`,
          tags: [
            `team_${payload.teamId}`,
            `document_${payload.documentId}`,
            `version:${payload.documentVersionId}`,
          ],
        },
      );

      logger.info("Document converted", {
        documentId: payload.documentId,
        documentVersionId: payload.documentVersionId,
        teamId: payload.teamId,
        docId: docId,
      });
      return;
    } catch (error) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      updateStatus({ progress: 0, text: "Conversion failed" });
      throw error;
    }
  },
});

// convert cad file to pdf
export const convertCadToPdfTask = task({
  id: "convert-cad-to-pdf",
  retry: { maxAttempts: 3 },
  queue: {
    concurrencyLimit: 2,
  },
  run: async (payload: ConvertPayload) => {
    const team = await prisma.team.findUnique({
      where: {
        id: payload.teamId,
      },
    });

    if (!team) {
      logger.error("Team not found", { teamId: payload.teamId });
      return;
    }

    const document = await prisma.document.findUnique({
      where: {
        id: payload.documentId,
      },
      select: {
        name: true,
        versions: {
          where: {
            id: payload.documentVersionId,
          },
          select: {
            file: true,
            originalFile: true,
            contentType: true,
            storageType: true,
          },
        },
      },
    });

    if (
      !document ||
      !document.versions[0] ||
      !document.versions[0].originalFile ||
      !document.versions[0].contentType
    ) {
      logger.error("Document not found", {
        documentId: payload.documentId,
        documentVersionId: payload.documentVersionId,
        teamId: payload.teamId,
      });
      return;
    }

    const fileUrl = await getFile({
      data: document.versions[0].originalFile,
      type: document.versions[0].storageType,
    });

    // create payload for cad to pdf conversion
    const tasksPayload = {
      tasks: {
        "import-file-v1": {
          operation: "import/url",
          url: fileUrl,
          filename: document.name,
        },
        "convert-file-v1": {
          operation: "convert",
          input: ["import-file-v1"],
          input_format: getExtensionFromContentType(
            document.versions[0].contentType,
          ),
          output_format: "pdf",
          engine: "cadconverter",
          all_layouts: true,
          auto_zoom: false,
        },
        "export-file-v1": {
          operation: "export/url",
          input: ["convert-file-v1"],
          inline: false,
          archive_multiple_files: false,
        },
      },
      redirect: true,
    };

    // Make the conversion request
    const conversionResponse = await retry.fetch(
      `${process.env.NEXT_PRIVATE_CONVERT_API_URL}`,
      {
        method: "POST",
        body: JSON.stringify(tasksPayload),
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PRIVATE_CONVERT_API_KEY}`,
          "Content-Type": "application/json",
        },
        retry: {
          byStatus: {
            "500-599": {
              strategy: "backoff",
              maxAttempts: 3,
              factor: 2,
              minTimeoutInMs: 1_000,
              maxTimeoutInMs: 30_000,
              randomize: false,
            },
          },
        },
      },
    );

    if (!conversionResponse.ok) {
      const body = await conversionResponse.json();
      throw new Error(
        `Conversion failed: ${body.message} ${conversionResponse.status}`,
      );
    }

    const conversionBuffer = Buffer.from(
      await conversionResponse.arrayBuffer(),
    );

    // get docId from url with starts with "doc_" with regex
    const match = document.versions[0].originalFile.match(/(doc_[^\/]+)\//);
    const docId = match ? match[1] : undefined;

    // Save the converted file to the database
    const { type: storageType, data } = await putFileServer({
      file: {
        name: `${document.name}.pdf`,
        type: "application/pdf",
        buffer: conversionBuffer,
      },
      teamId: payload.teamId,
      docId: docId,
    });

    if (!data || !storageType) {
      logger.error("Failed to save converted file to database", {
        documentId: payload.documentId,
        documentVersionId: payload.documentVersionId,
        teamId: payload.teamId,
        docId: docId,
      });
      return;
    }

    console.log("data from conversion", data);
    console.log("storageType from conversion", storageType);

    await prisma.documentVersion.update({
      where: { id: payload.documentVersionId },
      data: {
        file: data,
        type: "pdf",
        storageType: storageType,
      },
    });

    await convertPdfToImageRoute.trigger(
      {
        documentId: payload.documentId,
        documentVersionId: payload.documentVersionId,
        teamId: payload.teamId,
      },
      {
        idempotencyKey: `${payload.teamId}-${payload.documentVersionId}`,
        tags: [
          `team_${payload.teamId}`,
          `document_${payload.documentId}`,
          `version:${payload.documentVersionId}`,
        ],
      },
    );

    logger.info("Document converted", {
      documentId: payload.documentId,
      documentVersionId: payload.documentVersionId,
      teamId: payload.teamId,
      docId: docId,
    });
    return;
  },
});
