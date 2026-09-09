// ponytail: react-pdf (pdfjs) touches browser globals (DOMMatrix) at import
// time and crashed Next 16 build-time page-data collection. Lazy-import it so
// this module is safe to include in server bundles.
export const getPagesCount = async (arrayBuffer: ArrayBuffer) => {
  try {
    const { pdfjs } = await import("react-pdf");
    // ponytail: pdfjs-dist 5.x ships the worker as .mjs; self-hosted from
    // public/ (cdnjs only hosts .js for older versions → 404)
    pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    // Only in browser context
    if (typeof window !== "undefined") {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    } else {
      // Server-side rendering case
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      return pdf.numPages;
    }
  } catch (error) {
    console.error("Error getting PDF page count:", error);
    return 1; // Assuming at least one page if we can't determine
  }
};

export const getSheetsCount = async (arrayBuffer: ArrayBuffer) => {
  const XLSX = await import("xlsx");
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array" });
  return workbook.SheetNames.length ?? 1;
};
