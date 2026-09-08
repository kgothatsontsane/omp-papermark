// ponytail: react-pdf (pdfjs) touches browser globals (DOMMatrix) at import
// time and crashed Next 16 build-time page-data collection. Lazy-import it so
// this module is safe to include in server bundles.
export const getPagesCount = async (arrayBuffer: ArrayBuffer) => {
  try {
    const { pdfjs } = await import("react-pdf");
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    // Only in browser context
    if (typeof window !== "undefined") {
      try {
        // First attempt with the CDN worker configuration
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
      } catch (workerError) {
        console.warn("PDF worker error, trying fallback:", workerError);

        // Fall back to local worker
        pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

        try {
          // Try again with local worker
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          return pdf.numPages;
        } catch (fallbackError) {
          console.warn("Both CDN and local worker failed:", fallbackError);
          return 1; // Default to 1 page if both attempts fail
        }
      }
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
