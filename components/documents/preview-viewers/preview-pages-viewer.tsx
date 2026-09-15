import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { DocumentPreviewData } from "@/lib/types/document-preview";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface PreviewPagesViewerProps {
  documentData: DocumentPreviewData;
  onClose: () => void;
}

export function PreviewPagesViewer({
  documentData,
  onClose,
}: PreviewPagesViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageCache, setImageCache] = useState<{ [key: number]: boolean }>({});
  const [imageLoaded, setImageLoaded] = useState(imageCache[1] || false);
  const [scale, setScale] = useState(1);
  const [pageInput, setPageInput] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { pages, numPages, documentName, isVertical } = documentData;

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, Math.round((s + 0.25) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.min(numPages, Math.max(1, page));
      setCurrentPage(clamped);
      setImageLoaded(imageCache[clamped] || false);
      setPageInput(null);
    },
    [numPages, imageCache],
  );

  const commitPageInput = useCallback(
    (raw: string) => {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        goToPage(parsed);
      } else {
        setPageInput(null);
      }
    },
    [goToPage],
  );

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
      setImageLoaded(imageCache[currentPage + 1] || false);
    }
  }, [currentPage, numPages, imageCache]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setImageLoaded(imageCache[currentPage - 1] || false);
    }
  }, [currentPage, numPages, imageCache]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        return;
      }
      switch (e.key) {
        case "ArrowLeft":
          goToPreviousPage();
          break;
        case "ArrowRight":
          goToNextPage();
          break;
        case "Escape":
          onClose();
          break;
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
  }, [goToPreviousPage, goToNextPage, onClose, zoomIn, zoomOut, resetZoom]);

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

  if (!pages || pages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-gray-400">No pages available for preview</p>
      </div>
    );
  }

  const currentPageData = pages[currentPage - 1];

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageCache((prev) => ({ ...prev, [currentPage]: true }));
  };

  if (!currentPageData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-gray-400">Page not found</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden">
      {/* Navigation Controls */}
      <div className="absolute left-4 top-4 z-50">
        <div className="flex items-center gap-1 rounded-lg bg-black/20 px-3 py-2 text-white">
          <span className="text-sm">Page</span>
          <input
            value={pageInput ?? String(currentPage)}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitPageInput(pageInput ?? String(currentPage));
              }
            }}
            onBlur={() => {
              if (pageInput !== null) {
                commitPageInput(pageInput);
              }
            }}
            inputMode="numeric"
            aria-label="Page number"
            className="w-10 bg-transparent text-center text-sm text-white outline-none focus:bg-white/10"
          />
          <span className="text-sm">of {numPages}</span>
        </div>
      </div>

      {/* Document Title */}
      <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <div className="rounded-lg bg-black/20 px-3 py-2 text-white">
          <span className="text-sm font-medium">{documentName}</span>
        </div>
      </div>

      {/* Previous Page Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousPage}
        disabled={currentPage <= 1}
        className={cn(
          "absolute left-4 top-1/2 z-40 h-12 w-12 -translate-y-1/2 rounded-full bg-black/20 text-white hover:bg-black/40",
          currentPage <= 1 && "cursor-not-allowed opacity-50",
        )}
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </Button>

      {/* Next Page Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextPage}
        disabled={currentPage >= numPages}
        className={cn(
          "absolute right-4 top-1/2 z-40 h-12 w-12 -translate-y-1/2 rounded-full bg-black/20 text-white hover:bg-black/40",
          currentPage >= numPages && "cursor-not-allowed opacity-50",
        )}
      >
        <ChevronRightIcon className="h-6 w-6" />
      </Button>

      {/* Page Content */}
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
            src={currentPageData.file}
            alt={`Page ${currentPage}`}
            className={cn(
              "max-h-[calc(100vh-120px)] max-w-full object-contain transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={handleImageLoad}
            onError={() => {
              setImageLoaded(true);
              setImageCache((prev) => ({ ...prev, [currentPage]: true }));
            }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-16 right-4 z-50">
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

      {/* Bottom Navigation */}
      <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-lg bg-black/20 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="h-8 px-3 text-white hover:bg-white/10"
          >
            Previous
          </Button>

          <input
            value={pageInput ?? String(currentPage)}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitPageInput(pageInput ?? String(currentPage));
              }
            }}
            onBlur={() => {
              if (pageInput !== null) {
                commitPageInput(pageInput);
              }
            }}
            inputMode="numeric"
            aria-label="Page number"
            className="w-10 bg-transparent text-center text-sm text-white outline-none focus:bg-white/10"
          />
          <span className="text-sm text-white">/ {numPages}</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="h-8 px-3 text-white hover:bg-white/10"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
