# Design: Multi-file Add Document modal

Date: 2026-09-10
Status: Approved (user chose "batch inside modal" + page-zone polish)

## Problem

The "Add Document" modal's dropzone (`components/document-upload.tsx`) has
`multiple: false` — dropping several files accepts only the first. The
page-level bulk zone (`components/upload-zone.tsx`) already accepts multiple
files and folders, but users dropping onto the modal (docs pages and dataroom
pages) hit the single-file limit.

## Goals

- Drop or select multiple files in the Add Document modal; upload them all.
- Keep every existing single-file consumer unchanged (welcome flow
  `components/welcome/special-upload.tsx`, agreement panel
  `components/links/link-sheet/agreement-panel/index.tsx`).
- Small polish to the page-level drag overlay copy.

## Non-goals

- Parallel uploads (sequential matches the existing bulk zone and the DB
  connection caps from the 2026-09-09 fix).
- Handing modal-dropped files off to the page-level zone state.
- Any backend/API change.

## Design

### 1. `components/document-upload.tsx`

Add an optional prop `onFilesDropped?: (files: File[]) => void`.

- When passed: dropzone becomes `multiple: true`. Each accepted file is
  validated exactly as today (size limit by mime, PDF page-count check).
  Invalid files → existing toast per failure. All valid files →
  `onFilesDropped(validFiles)`.
- When absent: byte-for-byte current single-file behavior (`setCurrentFile`).
- `newVersion` mode and the other consumers never pass the prop, so they stay
  single-file.

### 2. `components/documents/add-document-modal.tsx`

- New state `multiFiles: File[] | null`, set by the new
  `onFilesDropped` callback (only rendered in the `!newVersion` Document tab):
  - 1 valid file → existing `currentFile` flow, unchanged UI.
  - >1 → multi mode.
- Multi mode UI: list of files (type icon, name, size, remove button); submit
  button reads "Upload N Documents".
- On submit (`handleFileUpload`), loop files sequentially through the existing
  per-file pipeline: `putFile` → `createDocument` → (dataroom:
  `addDocumentToDataroom` + `applyUnifiedPermissionsToDocument`) → SWR mutate
  + toast. Per-file try/catch: a failing file does not abort the rest.
- Final summary toast: "N documents uploaded" (+ "M failed" when any failed).
- Folder path (`currentFolderPath`) applies to every file in the batch.
- Document "Added" analytics event per successful file.
- Notion tab, newVersion flow, single-file flow: unchanged.

Covers docs pages and dataroom pages automatically (they share this modal).

### 3. Page-zone polish

`components/upload-zone.tsx` drag overlay copy: "Drop your file(s) here" →
"Drop files or folders here".

## Error handling

- Mixed batch: invalid files are rejected upfront with toasts; valid ones
  upload.
- Per-file failure mid-batch: logged/toasted, remaining files continue;
  summary toast reports both counts.
- Plan document-count limit: checked once upfront as today.

## Testing

- `npx tsc --noEmit`.
- Manual: modal multi-drop on docs page and dataroom page (mix of valid /
  oversized / wrong-type files); single-file regression on welcome and
  agreement panel; newVersion still single-file.
- Deploy: feature branch → PR → main (recent practice; `develop` is 71
  commits behind and unused) → verify on production.
