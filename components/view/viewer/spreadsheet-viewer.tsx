import { useCallback, useEffect, useRef, useState } from "react";

import { useSafePageViewTracker } from "@/lib/tracking/safe-page-view-tracker";
import { getTrackingOptions } from "@/lib/tracking/tracking-config";
import { cn } from "@/lib/utils";

import Nav, { TNavData } from "../nav";
import { AwayPoster } from "./away-poster";

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

export default function SpreadsheetViewer({
  file,
  fileName,
  versionNumber,
  navData,
}: {
  file: string;
  fileName: string;
  versionNumber: number;
  navData: TNavData;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const { linkId, documentId, viewId, isPreview, dataroomId } = navData;
  const pageNumber = 1;

  const startTimeRef = useRef(Date.now());

  const {
    trackPageViewSafely,
    resetTrackingState,
    startIntervalTracking,
    stopIntervalTracking,
    getActiveDuration,
    isInactive,
    updateActivity,
  } = useSafePageViewTracker({
    ...getTrackingOptions(),
    externalStartTimeRef: startTimeRef,
  });

  useEffect(() => {
    const trackingData = {
      linkId,
      documentId,
      viewId,
      pageNumber,
      versionNumber,
      dataroomId,
      isPreview,
    };

    startIntervalTracking(trackingData);

    return () => {
      stopIntervalTracking();
    };
  }, [
    linkId,
    documentId,
    viewId,
    versionNumber,
    dataroomId,
    isPreview,
    startIntervalTracking,
    stopIntervalTracking,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTrackingState();
        startIntervalTracking({
          linkId,
          documentId,
          viewId,
          pageNumber,
          versionNumber,
          dataroomId,
          isPreview,
        });
      } else {
        stopIntervalTracking();
        const duration = getActiveDuration();
        if (duration > 0) {
          trackPageViewSafely(
            {
              linkId,
              documentId,
              viewId,
              duration,
              pageNumber,
              versionNumber,
              dataroomId,
              isPreview,
            },
            true,
          );
        }
      }
    };

    const handleBeforeUnload = () => {
      stopIntervalTracking();
      const duration = getActiveDuration();
      if (duration > 0) {
        trackPageViewSafely(
          {
            linkId,
            documentId,
            viewId,
            duration,
            pageNumber,
            versionNumber,
            dataroomId,
            isPreview,
          },
          true,
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    linkId,
    documentId,
    viewId,
    versionNumber,
    dataroomId,
    isPreview,
    trackPageViewSafely,
    resetTrackingState,
    startIntervalTracking,
    stopIntervalTracking,
    getActiveDuration,
  ]);

  useEffect(() => {
    let cancelled = false;

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

        const xlsxFile = new File([buffer], fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        window.LuckyExcel.transformExcelToLucky(
          xlsxFile,
          (exportJson: any) => {
            if (cancelled) return;
            const sheets = exportJson?.sheets;
            if (!sheets || sheets.length === 0) {
              setError(
                "Could not read this spreadsheet. Download it to view the original file.",
              );
              return;
            }

            window.luckysheet!.create({
              container: "spreadsheet-viewer-container",
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
          },
        );
      } catch (e) {
        if (!cancelled) {
          console.error("Spreadsheet viewer error:", e);
          setError("Failed to load the spreadsheet viewer.");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.luckysheet?.destroy?.();
      } catch {
        // luckysheet throws when destroying an unmounted grid — ignore
      }
    };
  }, [file, fileName]);

  // Mac trackpad pinch = ctrlKey + wheel; zoom the grid instead of the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoomLevel + (e.deltaY < 0 ? 0.05 : -0.05));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomLevel, setZoom]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const setZoom = useCallback((z: number) => {
    const next = Math.min(4, Math.max(0.25, Math.round(z * 20) / 20));
    setZoomLevel(next);
    try {
      window.luckysheet?.setSheetZoom?.(next);
    } catch {
      // zoom API unavailable before grid init
    }
  }, []);

  return (
    <>
      <Nav type="sheet" navData={navData} />
      <div
        style={{ height: "calc(100dvh - 64px)" }}
        className="relative mx-2 flex h-screen flex-col sm:mx-6 lg:mx-8"
      >
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-gray-500">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="text-sm text-gray-900 underline underline-offset-4 dark:text-gray-100"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            id="spreadsheet-viewer-container"
            className={cn(
              "w-full flex-1 transition-opacity",
              loading && "pointer-events-none opacity-30",
            )}
          />
        )}
        {loading && !error ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading spreadsheet…</p>
          </div>
        ) : null}
        <div className="absolute bottom-[30px] right-4 z-50 flex items-center gap-1 rounded-full bg-gray-950/90 px-2 py-1 text-white shadow-lg">
          <button
            type="button"
            aria-label="Zoom out"
            className="px-2 text-lg leading-none hover:text-gray-300"
            onClick={() => setZoom(zoomLevel - 0.1)}
          >
            −
          </button>
          <span className="min-w-[3.5rem] text-center text-xs">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            className="px-2 text-lg leading-none hover:text-gray-300"
            onClick={() => setZoom(zoomLevel + 0.1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            className="px-2 text-xs leading-none hover:text-gray-300"
            onClick={() => setZoom(1)}
          >
            Reset
          </button>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 z-50 h-[26px] bg-gray-950"
          style={{
            background: navData.brand?.accentColor || "rgb(3, 7, 18)",
          }}
        />
        <AwayPoster
          isVisible={isInactive}
          inactivityThreshold={getTrackingOptions().inactivityThreshold}
          onDismiss={updateActivity}
        />
      </div>
    </>
  );
}
