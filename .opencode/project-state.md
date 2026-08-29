# Project state — omp-papermark

Living document. Updated at the end of every task when anything changes.
Source of truth for what is deployed, decided, verified. Missing/stale → rebuild
from git log + AGENTS.md.

Last updated: 2026-08-28

## IP capture FIXED (2026-08-19) — main bfb6693bd

- **Root cause**: `pages/api/record_view.ts` — the `bodyValidation` zod schema did NOT include
  `ip_address`. `bodyValidation.safeParse(pageViewObject)` (line ~168) strips unknown keys
  (zod default), so `result.data` dropped `ip_address` before `publishPageView()` → Tinybird
  stored null. IP extraction (x-real-ip/x-forwarded-for/x-vercel-forwarded-for) was always fine.
- **Fix**: added `ip_address: z.string().nullable().optional()` to `bodyValidation`; removed debug
  console.logs in record_view.ts.
- **Verified**: POST /api/record_view → latest `page_views__v3` row has `ip_address: "197.184.82.29"`
  (country ZA, city Johannesburg). Earlier rows still null (pre-fix).
- **Cleanup**: deleted debug endpoints `pages/api/debug-headers.ts`, `pages/api/debug-ip.ts`,
  `pages/api/test-ip.ts` (commit 63cd71b6d). `test-record-view.ts` never committed (created/discarded).
- Deploy `dpl_Ckx4QKUeYvW793erwjrczbroRN2B` READY, domain re-aliased dealroom.open-mic.co.za.
- Note: `package-lock.json` has unrelated unstaged change (react-email optional win32 binary from
  an earlier npm install) — left unstaged, not committed.

## Machine tooling: Watch Skill (personal, not app) — 2026-08-15

- watch-skill installed at `~/Library/Python/3.13/bin/watch-skill` (py3.13;
  `ocr` extra unavailable — onnxruntime has no py3.13 build, tesseract fallback
  used). MCP config in `~/.config/opencode/opencode.json` points at that binary.
- Patches (in site-packages): VAD retry in `transcribe/local.py`, tesseract
  fallback in `perceive/ocr.py`, timeouts (yt-dlp/ffmpeg/frame), offline-first
  embeddings in `index/embeddings.py`, new `synced.py` timeline + `synced`
  CLI command + `--synced`/`--detail beast` watch flags.
- Vision: FREE via OpenRouter `:free` (nemotron-3-nano-omni-30b-a3b-reasoning:free)
  using the opencode key; GPU-backed, $0. Config in `~/.watch-skill/.env`
  (see SKILL.md). Descriptions are CONTEXT-AWARE (each frame described with
  its transcript moment + OCR) → human-like, consistent person/setting across
  frames. moondream/Ollama removed (was ~45s/frame on x86 CPU).
- Descriptions are cache-first (persist to index `scenes.description`), capped
  by `--max-describe` (default 6), so re-runs are ~0s.
- This machine's internet is ~50KB/s baseline (Cloudflare/Ubuntu mirrors
  measured) — downloads are slow; nothing fixes the pipe.

## Current git state (2026-08-15)

- Branches: `main` (production) / `staging` / `develop`.
- HEAD on all branches ~`19fde644` (docs commit). Production (main) live, domain aliased.
- Upload fixes landed: duplicate-name rename/overwrite dialog (678c1519),
  graceful degradation for background conversion triggers (9b54b1cf), same for
  agreement uploads (3f2dfc5f).

## Upload failure ROOT CAUSE (2026-08-15) — FIXED + R2/worker verified E2E

- Symptom: pdf/doc/docx uploads failed with `[object Object]`; jpg/png/xlsx worked.
- Multi-part fix chain:
  1. `createDocument.ts` threw `new Error(error)` (stringified object → `[object Object]`).
     Now throws `DocumentUploadError` with real server message + code.
  2. Trigger.dev worker env was missing the DB URL vars — every conversion run
     failed at Prisma init (`POSTGRES_PRISMA_URL` must start with postgresql://).
     Set all worker env vars via the trigger.dev envvar API **using the PROD key**
     (<TRIGGER_PROD_KEY_REDACTED> — dev key writes to dev env only).
  3. Conversions now never block the document upload (try/catch + log degradation).
  4. **R2 creds rolled** (user). NEW keys: access key `<R2_ACCESS_KEY_REDACTED>`,
     secret `<R2_SECRET_REDACTED>`.
     Synced to local `.env`, Vercel (prod+preview), and worker env.
  5. **R2 ENDPOINT MUST include `/papermark`** (`https://3e00f6c5648dfecbbc0b0d427ea245a0.r2.cloudflarestorage.com/papermark`).
     Stored keys carry a `papermark/` prefix (baked in by the original endpoint). Stripping
     the path from the endpoint breaks presigned GET (404) — virtual-hosted URL becomes
     `<bucket>.<host>/<key>` and misses the prefix. Keep `/papermark` in endpoint everywhere.
  6. **INTERNAL_API_KEY was missing on the worker** → `getFile()` fell to the client branch
     (relative `/api/file/s3/get-presigned-get-url-proxy`) → "Failed to parse URL".
     Rolled a new key (was unrecoverable from Vercel), set on Vercel (prod+preview),
     worker, and local `.env`. Worker's `getFile` now uses the server branch with a full URL.
  7. Worker env vars had LITERAL QUOTES baked in (e.g. `"77e118..."`) from earlier setup —
     stripped quotes for all `NEXT_PRIVATE_UPLOAD_*`/`NEXT_PUBLIC_UPLOAD_TRANSPORT`.
- Prod trigger.dev keys: prod = <TRIGGER_PROD_KEY_REDACTED>, dev = <TRIGGER_DEV_KEY_REDACTED>
  (both user-provided). Worker env set via
  `POST https://api.trigger.dev/api/v1/projects/proj_palqkhramjxoleaduwuu/envvars/prod`
  with `Authorization: Bearer $PROD_KEY`.
- **Verified E2E**: re-triggered `convert-pdf-to-image-route` for a stuck PDF
  (`Producer_Agreement_Master_KG.pdf`, version `cmsu051to0002lc04vnga4ehj`) →
  run COMPLETED at 100% "Processing complete", `hasPages:true`, 5 `documentPage` rows,
  `isVertical:true`. Presigned GET via `/api/file/s3/get-presigned-get-url` → HTTP 200.
- Task id note: `convertFilesToPdfTask` registers as `convert-files-to-pdf` (NOT `convert-files`).
  Triggering with the wrong id leaves the run PENDING_VERSION forever.
- STILL OPEN: DOC/DOCX→PDF needs a Gotenberg/LibreOffice service
  (`NEXT_PRIVATE_CONVERSION_BASE_URL` + `NEXT_PRIVATE_INTERNAL_AUTH_TOKEN`), which is
  configured NOWHERE (not .env, not Vercel, not worker). PDF uploads work; docs/slides
  conversion will fail until a Gotenberg instance is provisioned and those vars set.
   `REVALIDATE_TOKEN` also missing everywhere (non-blocking revalidate step).

## Conversion stuck in dataroom (2026-08-28) — ROOT CAUSE + PERMANENT FIX

- SYMPTOM: dataroom uploads cycled "preparing preview / converting document / optimising
  for viewing" then errored; docs stuck `hasPages=false`.
- INVESTIGATION: direct prod call to `/api/mupdf/convert-page` WORKED (mupdf + R2 put fine),
  so the API path was healthy. Root cause was the **trigger.dev worker**:
  1. At ~18:25 a deploy/version-registration blip left the conversion run
     `run_06g4j7m1etjsolqf33e8s97b01` in `PENDING_VERSION` (never executes → doc stuck forever).
     Worker itself was healthy (other runs completed at version 20260818.21).
  2. LATENT CODE BUG in `lib/trigger/pdf-to-image-route.ts`: on the first page error the
     task did `return` (not throw) → run marked COMPLETED but `hasPages` stayed false.
     Silent permanent failure; trigger.dev global retry (3x) never fired because the run
     "succeeded".
- PERMANENT FIX (commit `a1501f44f`, deployed as trigger.dev `20260828.3`, 12 tasks):
  - `convertPdfToImageRoute` now continues past a single-page failure (graceful partial
    success) and only THROWS if ZERO pages converted → global retry + visible failure.
  - `trigger.config.ts` already sets `retries.default.maxAttempts: 3` (applies to all tasks).
- RESOLUTION (manual, pre-fix): re-triggered conversions for the 3 stuck docs via trigger.dev
  API. PDFs (`cmtd9fypa`, `cmtd75ovq`) fixed via `convert-pdf-to-image-route`; the `.docx`
  (`cmtd70bel`, type `docs`) fixed via `convert-files-to-pdf` (LibreOffice docx→pdf, which
  then triggers the image route). All three now `hasPages=true`; no other stuck docs in 7d.
- CORRECTION (stale note above): docx/slides conversion does NOT use Gotenberg. `convert-files.ts`
  converts locally with **LibreOffice** installed in the worker image via `aptGet` in
  `trigger.config.ts` (`build.extensions`). It WORKED this session (doc3 → 10 pages). The
  `NEXT_PRIVATE_CONVERSION_BASE_URL` / `NEXT_PRIVATE_INTERNAL_AUTH_TOKEN` vars are unused by
  this path.
- FAVICON (2026-08-28): replaced `public/favicon.ico` with the Open Mic logo PNG (180×180,
  PNG-embedded ICO generated via node — sharp in this build only emits PNG, not ICO).
  No link change needed (`pages/_app.tsx` already references `/favicon.ico`; App Router
  auto-serves `public/favicon.ico` too).
- AVATAR UPLOAD 500 (2026-08-29): `components/account/upload-avatar.tsx` → `uploadImage`
  (`lib/utils.ts`) → `PATCH /api/account`. ROOT CAUSE: `uploadImage` returned a RELATIVE url
  (`/api/file/s3/branding/...`) but `pages/api/account/index.ts` validates `image` with
  `z.string().url()` (absolute only). The `parseAsync` throw is OUTSIDE the try/catch →
  unhandled 500 on every avatar save. FIX (commit after this): `uploadImage` now returns an
  absolute url via `NEXT_PUBLIC_BASE_URL` (fallback `window.location.origin`). This also
  corrects OG/meta image urls for all other `uploadImage` callers (branding, link thumbnails,
  favicons).   NOTE: `parseAsync` in `/api/account` is still outside try/catch — a non-url image
  value would still 500 instead of 400; left as-is to keep the fix minimal.
- BRANDING (2026-08-29): replaced the Papermark letter-mark `P` in the admin sidebar
  collapsed icon (`components/sidebar/app-sidebar.tsx` — was `<Link>P</Link>`) with the
  Open Mic favicon (`/favicon.ico`). Full-mode header already shows `BRAND_NAME`
  ("Open Mic Productions") via `lib/branding.ts`. `lib/branding.ts` already points
  `BRAND_LOGO` at `/_static/open-mic/omp_logo_b.svg`; the wide wordmark is NOT suitable
  for the 24px collapsed icon, so the square favicon mark was used.
- PERF (2026-08-29): implemented McMaster/mcmaster.com speed techniques from Wes Bos
  video (youtube.com/watch?v=-Ln-8QM8KhQ). Added to `pages/_document.tsx` AND
  `app/layout.tsx`: (1) `<script type="speculationrules">` with `prefetch` on `a:hover`,
  `eagerness: "conservative"` — mirrors McMaster's hover-HTML-prefetch (no JS exec, HTML
  only, safe for an app); (2) `<link rel="preconnect">` to Tinybird analytics
  (`api.eu-west-1.aws.tinybird.co`) and Plausible (`plausible.io`). NOT changed: inlined
  CSS (Next bundles/inlines critical CSS in prod already) and fixed image dims (use
  next/image). Fonts already self-hosted via next/font (no external font origin).

 - Changes in `7a905c71`: F7 (self-host-aware view limits), F9 (whitelabel demo assets:
  local `dataroom-demo.mp4` + `favicon.jpeg`, author-CDN refs removed), MCP-verification
  made mandatory in loop.

## Deployment: VERCEL (production) — CRITICAL FACT

- The app is deployed on **Vercel** (production). Domain: https://dealroom.open-mic.co.za
  (`NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL` in `.env`).
- **Env vars are read from Vercel's project settings, NOT from local `.env`.**
  A change to local `.env` alone does NOT affect production.
- To change production behavior: set/update the var in Vercel project env vars
  (via dashboard or `vercel env`), then redeploy. Local `.env` is for local dev only.
- Implication (finding F6): `SELF_HOSTED_MODE=true` must be added to Vercel's env
  vars, not just `.env`, for the self-hosted plan bypass to work in production.
- Vercel CLI (`vercel`) is installed; `vercel whoami` hangs interactively — use
  non-interactive flags / pull env with `vercel env pull --environment=production`.

## Deployment matrix (branches → Vercel)

| Branch | Vercel env | URL pattern | Status |
|--------|-----------|-------------|--------|
| `main` | production | https://dealroom.open-mic.co.za | **LIVE** (auto-deploys on push) |
| `staging` | preview (auto) | https://omp-papermark-7wayqaw9w-open-mic-productions.vercel.app | LIVE @ bfa423de |
| `develop` | preview (auto) | https://omp-papermark-4gvx03voh-open-mic-productions.vercel.app | LIVE @ bfa423de |

- Latest production deploy (2026-08-15): commit `bfa423de`, URL
  https://omp-papermark-8j2bl5bp8-open-mic-productions.vercel.app, READY. App serves
  "Login | Open Mic Productions" (whitelabeled).
- Note: the first push (`d0c3f5c9`) had a build error (`module_compilation_error` —
  trigger.dev v4 SDK's `skills.js` imports Node builtins into the client bundle).
  Fixed in `bfa423de` by importing `runMetadata` from `@trigger.dev/core/v3` in
  `lib/utils/generate-trigger-status.ts` instead of `@trigger.dev/sdk/v3`.

- Vercel git link: github `kgothatsontsane/omp-papermark`, `productionBranch: main`,
  sourceless, auto-exposes system envs. Push to `main` → production deploy automatically.
- Preview env vars: present (35 vars). `NEXT_PUBLIC_SELF_HOSTED_MODE=true` set on
  production + preview. Vercel API token is a short-lived `vcp_` token (expires
  2026-11-13), used via `curl -H "Authorization: Bearer $TOKEN"` — stored in the
  user's session, NOT in this file (secrets never persist here).
- Vercel project: `prj_98U8fn41mCFZmlv4VLVS6j6o57Vn`, team `team_mLc5syhhwDuEIz6BLsD2WqVc`.
- Production deploy URL: https://omp-papermark-krlgb1jzk-open-mic-productions.vercel.app (latest).

## Session history (how we got here)

The current state was reached in one long session. Timeline:

1. **Started with a broken Tinybird pipeline.** The repo's Tinybird resources were
   written for the Classic era (`VERSION n` directives, auto-published pipes) but the
   live workspace is a **Forward** workspace, so the app's analytics calls failed.
2. **Discovered the workspace type.** `.env` holds `TINYBIRD_TOKEN` + `TINYBIRD_URL`
   (`https://api.eu-west-1.aws.tinybird.co`). Workspace `OMP_Papermark`, region aws
   eu-west-1. Classic CLI refused it; Classic experience is deprecated by Tinybird.
3. **Installed the Forward CLI.** `uv tool install tinybird --force` → `tb` v4.6.14
   (replacing the Classic `tb` v6.5.5). Forward CLI targets the cloud via
   `--cloud --token --host` flags; plain `tb deploy` needs Docker (Tinybird Local).
4. **Renamed resources to match Forward naming.** Datasources + pipes renamed via
   `git mv` to `__vN` filenames (versioning is by filename, not `VERSION`). Recreated
   `get_useragent_per_view__v2` from commit `49624432`. Fixed pipe `FROM` clauses to
   versioned datasource names. Added `TYPE ENDPOINT` to every pipe.
5. **Deployed & verified.** `tb --cloud deploy` → Deployment #2 live. 5 datasources +
   13 endpoints confirmed via HTTP API. End-to-end ingest/query test passed (realistic
   payload required — minimal payloads get quarantined), test row deleted after.
6. **Added graceful-degradation logging.** `record-link-view.ts` wraps Tinybird ingest
   in `recordTinybird()` try/catch so an outage never blocks email/webhook, logging each
   failure via `log({ type: "error" })`.
7. **Committed & pushed.** `953b8fc6`, in sync with origin/main.
8. **Built on-disk memory** (this doc + AGENTS.md) so context compression cannot
   degrade future output quality.

## Git

- Branch `main`, remote `github.com:kgothatsontsane/omp-papermark.git`.
- HEAD: `953b8fc6` — "fix: align Tinybird resources with Forward workspace and log degradation" (pushed, origin/main in sync).
- Recent history style: `fix: handle NaN versionNumber and invalid documentId in thumbnail endpoint`, `fix: use Promise.allSettled in visits endpoint...`, `fix: handle Tinybuster 403 errors in all stats endpoints`.

## Tinybird deployment (live)

- Workspace `OMP_Papermark`, FORWARD, region aws eu-west-1. Base `https://api.eu-west-1.aws.tinybird.co`.
- Env: `.env` → `TINYBIRD_TOKEN` (HTTP API token), `TINYBIRD_URL`. CLI uses `TB_TOKEN`/`TB_HOST`.
- Deployment #2 live (promoted & auto-deployed). URL: https://cloud.tinybird.co/aws/eu-west-1/OMP_Papermark/deployments/1.
- Deploy from `lib/tinybird/`:
  ```
  TB_TOKEN=$(grep '^TINYBIRD_TOKEN=' ../.env|cut -d= -f2); TB_HOST=$(grep '^TINYBIRD_URL=' ../.env|cut -d= -f2); tb --cloud --token "$TB_TOKEN" --host "$TB_HOST" deploy
  ```
- Classic CLI fallback (refuses Forward): `uvx --from tinybird-cli@latest tb`.

### Datasources (5, all verified live)
`page_views__v3`, `click_events__v1`, `video_views__v1`, `pm_click_events__v1`, `webhook_events__v1`.
Files in `lib/tinybird/datasources/`, named by FILENAME (VERSION ignored in Forward).

### Endpoints (13 pipes, all verified live, all end in `TYPE ENDPOINT`)
`get_click_events_by_view__v1`, `get_document_duration_per_viewer__v1`,
`get_page_duration_per_view__v5`, `get_total_average_page_duration__v5`,
`get_total_dataroom_duration__v1`, `get_total_document_duration__v1`,
`get_total_link_duration__v1`, `get_total_viewer_duration__v1`,
`get_useragent_per_view__v2` (recreated from commit 49624432), `get_useragent_per_view__v3`,
`get_video_events_by_document__v1`, `get_video_events_by_view__v1`, `get_webhook_events__v1`.
Files in `lib/tinybird/endpoints/`.

### End-to-end verification (done, results noted)
- Ingested realistic page_views__v3 event → returned via
  `GET /v0/pipes/get_total_viewer_duration__v1.json?viewIds=...&since=0&token=...` (sum_duration:5). Row then deleted; datasource empty.
- Minimal payloads get QUARANTINED (columns non-nullable) — must send full payload with country/city/etc.
- Undeclared query params (e.g. `until`) are ignored (HTTP 200).
- Endpoint query format: `https://api.eu-west-1.aws.tinybird.co/v0/pipes/<name>.json?<params>&token=...`.

## Tinybird client symbols

`lib/tinybird/publish.ts` — ingest endpoints:
`publishPageView`, `recordWebhookEvent`, `recordVideoView`, `recordClickEvent`, `recordLinkViewTB`.

`lib/tinybird/pipes.ts` — `tb.buildPipe(...)` query endpoints:
`getTotalAvgPageDuration`, `getViewPageDuration`, `getTotalDocumentDuration`, `getTotalLinkDuration`,
`getTotalViewerDuration`, `getViewUserAgent_v2`, `getViewUserAgent`, `getTotalDataroomDuration`,
`getDocumentDurationPerViewer`, `getWebhookEvents`, `getVideoEventsByDocument`, `getVideoEventsByView`,
`getClickEventsByView`.

## Current work

- `lib/tracking/record-link-view.ts:106-115` — `recordTinybird()` wraps `recordLinkViewTB(clickData)`
  in try/catch; on failure logs `Graceful degradation: Tinybird ingest failed for link ... (view ...)`
  via `log({ type: "error" })`. Tinybird outage never blocks email/webhook (all three run in `Promise.all`).

## Open threads / TODOs

- None outstanding. Tinybird fully migrated & deployed; degradation logging in place.

## Decisions & rationale

- Tinybird Classic → Forward migration: file renames encode versions (Classic `VERSION` directive ignored by Forward).
- Graceful degradation: only NON-security features may fail open; analytics (Tinybird) is the one degraded feature; every degradation logged.

## Rotation status (2026-08-16)
- trigger.dev prod key rotated: old `<OLD_TRIGGER_PROD_KEY>` → new `<TRIGGER_PROD_KEY>` (via `POST /api/v1/projects/{ref}/prod/regenerate-api-key` with CLI PAT from `~/Library/Preferences/trigger/config.json`). Old key kept in grace period by trigger.dev. Updated: Vercel (deleted 2 stale entries, recreated `wvzg54dN9R64suhD`), worker redeployed `20260816.1` (12 tasks). Local .env uses dev key (unaffected).
- R2 secret rotated by owner: access key unchanged `<R2_ACCESS_KEY>`, secret → `<R2_SECRET>` (old `171975d3...` replaced). Updated: local .env, Vercel (prod+preview, id `TjaDPYpOguCPX64f`), worker prod env (HTTP API `envvars/prod`). Verified: new secret reads CSV from R2 (1305 bytes).
- Verified end-to-end: export-visits run COMPLETED with new trigger key + new R2 secret; CSV retrieved + test export cleaned up.

## DOC/DOCX/PPT→PDF conversion — FIXED (LibreOffice in worker, no Gotenberg)

- trigger.dev worker image now installs LibreOffice via `aptGet({ packages: ["libreoffice"] })` in `trigger.config.ts` (build extension).
- `convert-files-to-pdf` rewritten to download the file to /tmp, run `libreoffice --headless --convert-to pdf --outdir`, read the PDF buffer, save via `putFileServer`, then trigger `convert-pdf-to-image-route` — same downstream flow as before. No `NEXT_PRIVATE_CONVERSION_BASE_URL` / `NEXT_PRIVATE_INTERNAL_AUTH_TOKEN` needed.
- Worker deployed `20260816.4` (12 tasks). Vercel prod redeployed with NEW R2 secret (fixes presigned-URL 403 from old revoked secret).
- **Verified end-to-end**: `ARTIST PRODUCER AGREEMENT.doc` → convert-files-to-pdf COMPLETED (6.9s) → convert-pdf-to-image-route COMPLETED (3 pages). Zero subscriptions, no external service.
- Note: `.doc`/`.docx`/`.ppt`/`.pptx`/`.odt`/`.ods`/`.odp`/`.rtf`/`.txt` convert via LibreOffice. CAD (dwg/dxf) now converts locally too: DXF→PDF via LibreOffice Draw, DWG→DXF via `dwg2dxf` (libredwg 0.9.3 compiled into the worker image from GNU FTP tarball). Paid CloudConvert API (`NEXT_PRIVATE_CONVERT_API_URL`/`KEY`, engine `cadconverter`) fully removed. Worker `20260816.12`. DXF path verified e2e (COMPLETED 8.3s, 1 page); DWG binary compiled but not e2e-tested.
