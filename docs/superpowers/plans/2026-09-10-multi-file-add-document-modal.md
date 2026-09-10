# Multi-file Add Document modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Add Document modal's drag-drop accept and batch-upload multiple files; polish the page-level drop overlay copy.

**Architecture:** `DocumentUpload` gains an optional `onFilesDropped(files)` prop that enables `multiple` and per-file validation (size, PDF page count). The modal maps 1 file → existing single-file flow, >1 → a `multiFiles` batch uploaded sequentially through the existing per-file pipeline (putFile → createDocument → dataroom add + permissions). No backend changes.

**Tech Stack:** Next.js 14 (pages router), react-dropzone, SWR, sonner, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-09-10-multi-file-add-document-modal-design.md`

**Note:** Repo has no test runner (typecheck + lint only). Verification = `npx tsc --noEmit` per task + manual browser test after deploy.

---

### Task 1: `DocumentUpload` accepts multiple validated files

**Files:**
- Modify: `components/document-upload.tsx` (props interface ~line 26, `useDropzone` ~lines 55–147)

- [ ] **Step 1: Add `onFilesDropped` prop and switch dropzone to multiple**

In `components/document-upload.tsx`, change the component signature:

```tsx
export default function DocumentUpload({
  currentFile,
  setCurrentFile,
  onFilesDropped,
}: {
  currentFile: File | null;
  setCurrentFile: React.Dispatch<React.SetStateAction<File | null>>;
  onFilesDropped?: (files: File[]) => void;
}) {
```

Rename the existing dropzone hook destructuring target so the options object can branch (keep everything else identical):

```tsx
const { getRootProps, getInputProps } = useDropzone({
  accept:
    isSelfHostedMode()
      ? FULL_PLAN_ACCEPTED_FILE_TYPES
      : isFree && !isTrial
        ? FREE_PLAN_ACCEPTED_FILE_TYPES
        : FULL_PLAN_ACCEPTED_FILE_TYPES,
  multiple: !!onFilesDropped,
  onDropAccepted: (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    if (!onFilesDropped) {
      // existing single-file path: unchanged
      const file = acceptedFiles[0];
      const fileType = file.type;
      const fileSizeLimitMB = getFileSizeLimit(fileType, fileSizeLimits); // in MB
      const fileSizeLimit = fileSizeLimitMB * 1024 * 1024; // in bytes

      if (file.size > fileSizeLimit) {
        const message = `File size too big for ${fileType} (max. ${fileSizeLimitMB} MB)`;
        if (!isSelfHostedMode() && isFree && !isTrial) {
          toast.error(message, {
            description: "Upgrade to a paid plan to increase the limit",
            action: {
              label: "Upgrade",
              onClick: () => router.push("/settings/upgrade"),
            },
            duration: 10000,
          });
        } else {
          toast.error(message);
        }
        return;
      }

      if (file.type !== "application/pdf") {
        setCurrentFile(file);
        return;
      }
      file
        .arrayBuffer()
        .then((buffer) => {
          getPagesCount(buffer).then((numPages) => {
            if (numPages > fileSizeLimits.maxPages) {
              toast.error(
                `File has too many pages (max. ${fileSizeLimits.maxPages})`,
              );
            } else {
              setCurrentFile(file);
            }
          });
        })
        .catch((error) => {
          console.error("Error reading file:", error);
          toast.error("Failed to read the file");
        });
      return;
    }

    // multi-file path: validate each accepted file, hand the valid ones over
    void (async () => {
      const valid: File[] = [];
      for (const file of acceptedFiles) {
        const fileSizeLimitMB = getFileSizeLimit(file.type, fileSizeLimits);
        const fileSizeLimit = fileSizeLimitMB * 1024 * 1024;

        if (file.size > fileSizeLimit) {
          toast.error(
            `${file.name}: File size too big (max. ${fileSizeLimitMB} MB)`,
          );
          continue;
        }

        if (file.type === "application/pdf") {
          try {
            const numPages = await getPagesCount(await file.arrayBuffer());
            if (numPages > fileSizeLimits.maxPages) {
              toast.error(
                `${file.name}: File has too many pages (max. ${fileSizeLimits.maxPages})`,
              );
              continue;
            }
          } catch (error) {
            console.error("Error reading file:", error);
            toast.error(`${file.name}: Failed to read the file`);
            continue;
          }
        }

        valid.push(file);
      }
      if (valid.length > 0) {
        onFilesDropped(valid);
      }
    })();
  },
  onDropRejected: (fileRejections) => {
    // existing onDropRejected body unchanged
```

Keep the existing `onDropRejected` body exactly as-is (it already toasts per rejection group).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/document-upload.tsx
git commit -m "feat: DocumentUpload accepts multiple files via onFilesDropped"
```

---

### Task 2: Modal batch state, UI, and sequential upload

**Files:**
- Modify: `components/documents/add-document-modal.tsx` (state ~line 78, new `handleBatchUpload` after `handleFileUpload` (~line 408), render ~lines 793–835)

- [ ] **Step 1: Add imports and batch state**

Add to imports at top of `components/documents/add-document-modal.tsx`:

```tsx
import { X } from "lucide-react";
import { bytesToSize } from "@/lib/utils";
```

(`getSupportedContentType`, `putFile`, `createDocument`, `DocumentUploadError`, `mutate`, `toast`, `analytics` are already imported.)

Next to the other state (after line 78 `currentFile`), add:

```tsx
const [multiFiles, setMultiFiles] = useState<File[] | null>(null);
```

- [ ] **Step 2: Wire `onFilesDropped` + reset + remove helpers**

After the `applyUnifiedPermissionsToDocument` function (~line 213), add:

```tsx
const handleFilesDropped = (files: File[]) => {
  if (files.length === 1) {
    setCurrentFile(files[0]);
    return;
  }
  setMultiFiles(files);
};

const removeBatchFile = (target: File) => {
  setMultiFiles((prev) => {
    const next = prev?.filter((f) => f !== target) ?? null;
    return next && next.length > 0 ? next : null;
  });
};
```

In `clearModelStates` (~line 712), add a reset line:

```tsx
const clearModelStates = () => {
  currentFile !== null && setCurrentFile(null);
  notionLink !== null && setNotionLink(null);
  setMultiFiles(null);
  setIsOpen(!isOpen);
  setAddDocumentModalOpen && setAddDocumentModalOpen(!isOpen);
};
```

- [ ] **Step 3: Add the batch upload function**

Insert after the end of `handleFileUpload` (~line 408, before `handleRenameAndUpload`):

```tsx
const handleBatchUpload = async (): Promise<void> => {
  if (!multiFiles || multiFiles.length === 0) return;

  if (!canAddDocuments) {
    toast.error("You have reached the maximum number of documents.");
    return;
  }

  setUploading(true);
  let succeeded = 0;
  let failed = 0;

  for (const file of multiFiles) {
    try {
      let contentType = file.type;
      let supportedFileType = getSupportedContentType(contentType);

      if (file.name.endsWith(".dwg") || file.name.endsWith(".dxf")) {
        supportedFileType = "cad";
        contentType = `image/vnd.${file.name.split(".").pop()}`;
      }

      if (file.name.endsWith(".xlsm")) {
        supportedFileType = "sheet";
        contentType = "application/vnd.ms-excel.sheet.macroEnabled.12";
      }

      if (!supportedFileType) {
        failed++;
        toast.error(`${file.name}: Unsupported file format.`);
        continue;
      }

      const { type, data, numPages, fileSize } = await putFile({
        file,
        teamId,
      });

      const documentData: DocumentData = {
        name: file.name,
        key: data!,
        storageType: type!,
        contentType: contentType,
        supportedFileType: supportedFileType,
        fileSize: fileSize,
      };

      const response = await createDocument({
        documentData,
        teamId,
        numPages,
        folderPathName: currentFolderPath?.join("/"),
      });
      const document = await response.json();

      if (isDataroom && dataroomId) {
        const dataroomResponse = await addDocumentToDataroom({
          documentId: document.id,
          folderPathName: currentFolderPath?.join("/"),
        });

        if (dataroomResponse?.ok) {
          const dataroomDocument =
            (await dataroomResponse.json()) as DataroomDocument & {
              dataroom: {
                _count: { viewerGroups: number; permissionGroups: number };
              };
            };

          await applyUnifiedPermissionsToDocument(
            document,
            dataroomDocument,
            currentFolderPath,
          );
        }
      } else {
        mutate(`/api/teams/${teamId}/documents`);
      }

      analytics.capture("Document Added", {
        documentId: document.id,
        name: document.name,
        numPages: document.numPages,
        path: router.asPath,
        type: document.type,
        contentType: document.contentType,
        teamId: teamId,
        bulkupload: true,
        dataroomId: isDataroom ? dataroomId : undefined,
        $set: {
          teamId: teamId,
          teamPlan: plan,
        },
      });

      succeeded++;
    } catch (error) {
      failed++;
      console.error(`Batch upload failed for ${file.name}:`, error);
      if (
        error instanceof DocumentUploadError &&
        error.code === "DUPLICATE_DOCUMENT"
      ) {
        toast.error(
          `${file.name}: A document with this name already exists in this folder. Rename it and upload separately.`,
        );
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`${file.name}: ${errorMessage}`);
      }
    }
  }

  setUploading(false);
  setMultiFiles(null);
  if (succeeded > 0) {
    toast.success(
      failed > 0
        ? `${succeeded} document(s) uploaded, ${failed} failed.`
        : `${succeeded} document(s) uploaded successfully! 🎉`,
    );
  }
  setIsOpen(false);
  setAddDocumentModalOpen && setAddDocumentModalOpen(false);
};
```

- [ ] **Step 4: Branch `handleFileUpload` entry to batch mode**

At the top of `handleFileUpload` (~line 215, after `event.preventDefault()`):

```tsx
event.preventDefault();

if (multiFiles && multiFiles.length > 0 && !newVersion) {
  await handleBatchUpload();
  return;
}
```

- [ ] **Step 5: Render the batch list and pass the prop**

Pass the callback in the modal body (line ~800):

```tsx
<DocumentUpload
  currentFile={currentFile}
  setCurrentFile={setCurrentFile}
  onFilesDropped={!newVersion ? handleFilesDropped : undefined}
/>
```

Directly below the `<div className="grid grid-cols-1 ...">` block that wraps `DocumentUpload` (after its closing `</div>`, inside `<div className="space-y-1">`), add the batch list:

```tsx
{multiFiles && multiFiles.length > 0 ? (
  <div className="mt-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
    <p className="text-sm font-medium">{multiFiles.length} file(s) selected</p>
    <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
      {multiFiles.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center justify-between text-sm"
        >
          <span className="truncate">
            {file.name}{" "}
            <span className="text-gray-500">({bytesToSize(file.size)})</span>
          </span>
          <button
            type="button"
            onClick={() => removeBatchFile(file)}
            className="ml-2 shrink-0 text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-300"
            aria-label={`Remove ${file.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  </div>
) : null}
```

Update the submit button (~line 826):

```tsx
<Button
  type="submit"
  className="w-full lg:w-1/2"
  disabled={
    uploading || (!currentFile && !(multiFiles && multiFiles.length > 0))
  }
  loading={uploading}
>
  {uploading
    ? "Uploading..."
    : multiFiles && multiFiles.length > 1
      ? `Upload ${multiFiles.length} Documents`
      : "Upload Document"}
</Button>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/documents/add-document-modal.tsx
git commit -m "feat: batch-upload multiple files from Add Document modal"
```

---

### Task 3: Page-zone overlay copy

**Files:**
- Modify: `components/upload-zone.tsx:728`

- [ ] **Step 1: Update copy**

In `components/upload-zone.tsx`, change:

```tsx
<span className="font-medium text-foreground">
  Drop your file(s) here
</span>
```

to:

```tsx
<span className="font-medium text-foreground">
  Drop files or folders here
</span>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload-zone.tsx
git commit -m "fix: clarify drag overlay copy to files or folders"
```

---

### Task 4: Verify, PR, deploy

- [ ] **Step 1: Full typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 2: Push + PR to main**

```bash
git push -u origin feat/multi-file-add-document-modal
gh pr create --base main --title "feat: accept multiple files in Add Document modal" --body "Batch drag-drop upload in the Add Document modal (docs + dataroom pages), page-zone overlay copy. Spec: docs/superpowers/specs/2026-09-10-multi-file-add-document-modal-design.md"
```

- [ ] **Step 3: Merge → deploy → alias (CRITICAL)**

After merge: Vercel auto-deploys main. **After every deploy, set the alias**:

```bash
vercel alias set <new-deployment-url> dealroom.open-mic.co.za
```

- [ ] **Step 4: Manual smoke test on production**

1. Docs page → Add Document → drop 3 PDFs (mix sizes) → batch list shows, "Upload 3 Documents", sequential upload, summary toast, lists refresh.
2. Dataroom folder page → same (documents land in folder + dataroom).
3. Drop 1 file → old single-file flow unchanged (preview + redirect).
4. New Version upload + welcome flow + agreement panel: still single-file.
5. Sync `develop`/`staging` with `main` after merge (mandate).

- [ ] **Step 5: Update project state**

Append results to `.opencode/project-state.md` in the merge commit or follow-up docs commit.
