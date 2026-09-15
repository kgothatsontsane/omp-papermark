import { useCallback, useEffect, useRef, useState } from "react";

import { DocumentPreviewData } from "@/lib/types/document-preview";
import { cn } from "@/lib/utils";

interface PreviewImageViewerProps {
  documentData: DocumentPreviewData;
  onClose: () => void;
}

export function PreviewImageViewer({
  documentData,
  onClose,
}: PreviewImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  const { file, documentName } = documentData;

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, Math.round((s + 0.25) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
        case "_":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((s) => Math.min(3, Math.round((s + 0.25) * 100) / 100));
      } else if (e.deltaY > 0) {
        setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  if (!file) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-gray-400">Image not available</p>
      </div>
    );
  }

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden">
      {/* Document Title */}
      <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <div className="rounded-lg bg-black/20 px-3 py-2 text-white">
          <span className="text-sm font-medium">{documentName}</span>
        </div>
      </div>

      {/* Image Content */}
      <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
        <div
          className="relative max-h-full max-w-full"
          style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </div>
          )}

          <img
            src={file}
            alt={documentName}
            className={cn(
              "max-h-[calc(100vh-120px)] max-w-full object-contain transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={handleImageLoad}
            onError={() => setImageLoaded(true)}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-50">
        <div className="flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-white">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={zoomOut}
            className="px-2 text-lg leading-none hover:text-gray-300"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={zoomIn}
            className="px-2 text-lg leading-none hover:text-gray-300"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={resetZoom}
            className="px-2 text-xs leading-none hover:text-gray-300"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
