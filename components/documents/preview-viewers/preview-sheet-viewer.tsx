import { useState } from "react";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

function colLetter(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

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

  const cols = sheet.columnData ?? [];
  const rows = sheet.rowData ?? [];
  const headerRow = rows[0] ?? {};
  const dataRows = rows.slice(1);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* scroll container */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
        <div style={{ fontSize: `${Math.round(zoom * 100)}%` }}>
          <table className="border-collapse text-xs text-gray-200">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-10 min-w-[2.5rem] border border-gray-700 bg-gray-900 px-1 text-center text-gray-500">
                  #
                </th>
                {cols.map((col: string, i: number) => (
                  <th
                    key={i}
                    className="sticky top-0 z-20 h-7 min-w-[6rem] max-w-[12rem] truncate border border-gray-700 bg-gray-800 px-2 py-1 text-left font-medium text-gray-300"
                    title={String(col)}
                  >
                    {colLetter(i)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 top-7 z-30 w-10 min-w-[2.5rem] border border-gray-700 bg-gray-900 px-1 text-center text-gray-500">
                  1
                </th>
                {cols.map((col: string, i: number) => (
                  <th
                    key={i}
                    className="sticky top-7 z-20 min-w-[6rem] max-w-[12rem] truncate border border-gray-700 bg-gray-700 px-2 py-1 text-left font-semibold text-white"
                    title={String(headerRow[col] ?? "")}
                  >
                    {headerRow[col] ?? ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row: any, ri: number) => (
                <tr
                  key={ri}
                  className={ri % 2 === 0 ? "bg-gray-900" : "bg-gray-900/40"}
                >
                  <td className="sticky left-0 z-10 border border-gray-700 bg-gray-900 px-1 text-center text-gray-500">
                    {ri + 2}
                  </td>
                  {cols.map((col: string, ci: number) => (
                    <td
                      key={ci}
                      className="min-w-[6rem] max-w-[12rem] truncate border border-gray-700 px-2 py-1 tabular-nums"
                      title={String(row[col] ?? "")}
                    >
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length >= 200 && (
          <p className="mt-2 text-xs text-gray-500">
            Showing first 200 rows.
          </p>
        )}
      </div>
      {/* bottom sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-gray-800 px-2 py-1 [-webkit-overflow-scrolling:touch]">
        {sheets.map((s: any, i: number) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "whitespace-nowrap rounded px-3 py-1 text-xs",
              i === active
                ? "border-b-2 border-blue-500 text-white"
                : "text-gray-400 hover:bg-gray-800",
            )}
          >
            {s.sheetName}
          </button>
        ))}
      </div>
      {/* zoom pill */}
      <div className="absolute right-3 top-3 z-40 flex items-center gap-1 rounded-full bg-gray-950/90 px-2 py-1 text-white shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          className="px-2 text-lg leading-none hover:text-gray-300"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-xs">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
          className="px-2 text-lg leading-none hover:text-gray-300"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2 text-xs leading-none hover:text-gray-300"
          aria-label="Reset zoom"
        >
          100%
        </button>
      </div>
    </div>
  );
}
