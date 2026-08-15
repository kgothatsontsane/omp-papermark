# Project state — omp-papermark

Living document. Updated at the end of every task when anything changes.
Source of truth for what is deployed, decided, verified. Missing/stale → rebuild
from git log + AGENTS.md.

Last updated: 2026-08-15

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
| `main` | production | https://dealroom.open-mic.co.za | LIVE (auto-deploys on push) |
| `staging` | preview (auto) | omp-papermark-*-open-mic-productions.vercel.app | auto-created on first push |
| `develop` | preview (auto) | omp-papermark-*-open-mic-productions.vercel.app | auto-created on first push |

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
