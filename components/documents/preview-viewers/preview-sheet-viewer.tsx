import { useState } from "react";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export function PreviewSheetViewer({
  documentData,
  onClose,
}: {
  documentData: any;
  onClose: () => void;
}) {
  const sheets = documentData.sheetData ?? [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const sheet = sheets[active];

  if (!sheets.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        No sheet data available.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-800 px-2 py-1">
        {sheets.map((s: any, i: number) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "rounded px-3 py-1 text-sm",
              i === active
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800",
            )}
          >
            {s.sheetName}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <table className="border-collapse text-xs text-gray-200">
            <thead>
              <tr>
                {sheet.columnData.map((col: string, i: number) => (
                  <th
                    key={i}
                    className="border border-gray-700 bg-gray-800 px-2 py-1 text-left font-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rowData.map((row: any, ri: number) => (
                <tr key={ri}>
                  {sheet.columnData.map((col: string, ci: number) => (
                    <td
                      key={ci}
                      className="border border-gray-700 px-2 py-1 whitespace-nowrap"
                    >
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sheet.rowData.length >= 200 && (
          <p className="mt-2 text-xs text-gray-500">
            Showing first 200 rows.
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-gray-800 py-2">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="rounded bg-gray-800 p-1 text-gray-300 hover:bg-gray-700"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          className="rounded bg-gray-800 p-1 text-gray-300 hover:bg-gray-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
