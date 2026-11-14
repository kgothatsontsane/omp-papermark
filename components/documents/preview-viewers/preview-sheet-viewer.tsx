import { useCallback, useEffect, useRef, useState } from "react";

const LUCKYSHEET_VERSION = "2.1.13";
const LUCKYEXCEL_VERSION = "1.0.1";

declare global {
  interface Window {
    luckysheet?: any;
    LuckyExcel?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), {
          once: true,
        });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function loadStyles(): void {
  const base = `https://cdn.jsdelivr.net/npm/luckysheet@${LUCKYSHEET_VERSION}/dist`;
  const hrefs = [
    `${base}/plugins/css/pluginsCss.css`,
    `${base}/plugins/plugins.css`,
    `${base}/css/luckysheet.css`,
    `${base}/assets/iconfont/iconfont.css`,
  ];
  for (const href of hrefs) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

let previewInstance = 0;

export function PreviewSheetViewer({
  documentData,
}: {
  documentData: any;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const containerId = useRef(`preview-sheet-${++previewInstance}`);

  const file: string | undefined = documentData?.file;
  const fileName: string =
    documentData?.documentName ?? documentData?.fileName ?? "spreadsheet";

  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setError("No file available for preview.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        loadStyles();
        await loadScript(
          `https://cdn.jsdelivr.net/npm/luckysheet@${LUCKYSHEET_VERSION}/dist/plugins/js/plugin.js`,
        );
        await loadScript(
          `https://cdn.jsdelivr.net/npm/luckysheet@${LUCKYSHEET_VERSION}/dist/luckysheet.umd.js`,
        );
        await loadScript(
          `https://cdn.jsdelivr.net/npm/luckyexcel@${LUCKYEXCEL_VERSION}/dist/luckyexcel.umd.js`,
        );
        if (cancelled || !window.LuckyExcel || !window.luckysheet) return;

        const response = await fetch(file);
        if (!response.ok) {
          throw new Error(`Failed to fetch file (${response.status})`);
        }
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const xlsxFile = new File(
          [buffer],
          fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
          {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        );

        window.LuckyExcel.transformExcelToLucky(xlsxFile, (exportJson: any) => {
          if (cancelled) return;
          const sheets = exportJson?.sheets;
          if (!sheets || sheets.length === 0) {
            setError(
              "Could not read this spreadsheet. Download it to view the original file.",
            );
            return;
          }

          window.luckysheet!.create({
            container: containerId.current,
            data: sheets,
            title: exportJson.info?.name ?? fileName,
            showtoolbar: true,
            showSheetBar: true,
            allowEdit: false,
            enableAddRow: false,
            addRow: 0,
            showConfigWindow: false,
            sheetFormulaBar: false,
          } as any);
          setLoading(false);
        });
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load the spreadsheet preview.");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.luckysheet?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [file, fileName, attempt]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading spreadsheet…</p>
        </div>
      )}
      {error && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-gray-400">{error}</p>
          <button
            onClick={handleRetry}
            className="text-sm text-gray-200 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}
      <div id={containerId.current} className="h-full w-full" />
    </div>
  );
}
