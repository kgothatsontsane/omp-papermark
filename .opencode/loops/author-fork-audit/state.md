# author-fork-audit — loop memory

Ledger of findings. Updated every turn. Status: `OPEN | FIXED | BLOCKED | SKIP`.

## PRIMARY INTENT (the loop's north star — why it exists)

**"Export Visits" for a data room spins forever / errors instead of delivering the CSV.**
Started 2026-08-14. SUCCESS = clicking "Export Visits" on a dataroom produces a
downloadable CSV (or a clear, correct failure) in production.
Current state: BLOCKED on owner action (see Blocked inputs). Root cause chain:
(1) no Trigger.dev worker was running → runs stayed QUEUED → infinite spinner;
(2) after upgrading to a deployable setup, the export POST now 500s in PROD because
Vercel's `TRIGGER_SECRET_KEY` is empty → "An error occurred while starting the export".

## Detours (context switches — justified + return condition)

| Detour | Why (blocker/grenade?) | Result | Returned? |
|--------|------------------------|--------|-----------|
| DTR-1 trigger.dev project ref | BLOCKED export: config pointed to fork author's project | FIXED → owner's project `proj_palqkhramjxoleaduwuu` | yes |
| DTR-2 trigger.dev 3.x→4.5.11 upgrade | BLOCKED export: needed a working worker/deploy path + build broke on v4 client import | FIXED (queue string, prisma mode, runMetadata from core) | yes |
| DTR-3 branches + Vercel envs | GOTCHA discovered: prod runs on Vercel; needed main/staging/develop + env sync | DONE (all three envs deploy) | yes |
| DTR-4 whitelabel demo assets (F9) | GRENADE: prod still served author's CDN assets; part of self-host goal | FIXED (local video + image) | yes |
| DTR-5 loop hardening (costs, MCP verify, auto-discovery, focus discipline) | PROTECTIVE: loop was drifting (this section is the fix) | DONE | yes |

## Grenades (potential explosions — defuse after primary intent or while blocked)

| Rank | Grenade | Blast radius | Status |
|------|---------|--------------|--------|
| G1 | Vercel `TRIGGER_SECRET_KEY` empty | Export/background jobs 500 in prod (ALREADY detonating) | BLOCKED on owner (needs tr_prod_ key) |
| G2 | `ai@2.2.37` pin (D1) | If flagged vulnerable or a dep upgrade forces the port, Assistant chat breaks | tracked in debt ledger |
| G3 | webhook plan gates without self-host guard (send-webhook-event, link-created, document-created) | Webhooks silently not delivered in self-hosted mode | FIXED — all three guarded with `!isSelfHostedMode()`. Auto-discovery P3 probe now context-aware (no false positives). |

## Findings ledger

| # | Finding | Status | Evidence / notes |
|---|---------|--------|------------------|
| F1 | `trigger.config.ts` project ref = upstream `proj_plmsfqvqunboixacjjus` | FIXED | Changed to `proj_palqkhramjxoleaduwuu` (owner's OMP-Papermark project, verified via Trigger.dev API) |
| F2 | `@trigger.dev/*` packages at 3.3.17 vs CLI 4.5.11 | FIXED | Upgraded to 4.5.11 (all three). Ported code: `conversionQueue` returns string (v4 trigger `queue`), `prismaExtension({ mode: "legacy" })`. `ai` kept at 2.2.37 via npm overrides (see dependency debt D1). tsc clean; `deploy --dry-run` builds successfully. |
| F3 | `.env` TRIGGER_SECRET_KEY = `tr_dev_*` (dev-scoped) | BLOCKED | **Production export fails**: Vercel's `TRIGGER_SECRET_KEY` is EMPTY (verified via Vercel API). The SDK needs it for `task.trigger()`. Each env has its own key (`tr_dev_`/`tr_prod_`/`tr_stg_`), created ONLY in Trigger.dev dashboard → Project → API keys. CLI cannot mint them. Need owner to create `prod` key and set it on Vercel (see blocked inputs). |
| F5 | Export job stuck QUEUED — no Trigger.dev worker running | FIXED (ops) | Diagnosis: run is QUEUED, no `trigger.dev dev` / deploy. Fix = run worker. Config now points at owner's project. |
| F6 | **`SELF_HOSTED_MODE` not set** | FIXED | **ROOT CAUSE of "much doesn't work."** Local `.env`: `SELF_HOSTED_MODE=true` added. Vercel (production + preview): `NEXT_PUBLIC_SELF_HOSTED_MODE` upserted to `"true"` (encrypted) via `POST /v10/projects/{id}/env?upsert=true`; stale empty `sensitive` preview entry deleted. **Needs redeploy on Vercel to take effect (Next inlines NEXT_PUBLIC_* at build).** |
| F7 | `pages/api/links/[id]/visits.ts:94` raw `plan === "free"` gate ignores self-hosted | FIXED | Added `!isSelfHostedMode() &&` guard; also switched `visitors-table.tsx` to usePlan `isFree` (F8). tsc clean. |
| F8 | `components/visitors/visitors-table.tsx:81` `plan === "free"` re-derivation | FIXED | Now uses `isFree` from usePlan (self-hosted aware). |
| F9 | Demo assets on author's CDN (login screenshot, dataroom video, next.config hostnames) | FIXED | Replaced with local brand assets: generated `public/_static/open-mic/dataroom-demo.mp4` (15s, 1280x720, acquirer-focused cards: NDA, watermarks, permissions, audit trail, data residency) + login image → local `omp_banner_w.jpg`. Verified: PIL text-bbox check (all text within canvas) + ffprobe (valid H.264). Removed unused author-CDN hostnames from next.config remote patterns (0 references remain). |

## Open blocked inputs (need owner)

- **Trigger.dev prod secret key**: In Trigger.dev dashboard → your project
  `OMP-Papermark` (proj_palqkhramjxoleaduwuu) → **API keys** page → create/copy the
  **prod** secret key (starts `tr_prod_`). Then set it as `TRIGGER_SECRET_KEY` in
  **Vercel** env vars (production) and redeploy. This unblocks Export Visits in prod.
  (Local dev uses the existing `tr_dev_` key + `npm run trigger:v3:dev` worker.)
- **REDEPLOY on Vercel** to apply F6: env var set, but `NEXT_PUBLIC_*` vars are
  inlined at build time. Trigger a production redeploy (git push or dashboard
  "Redeploy") so the new value takes effect.

## Decisions

- Upstream project ref F1: replaced with owner's project (verified live via API, env list works).
- F3 approach pending: prod deploy path needs `TRIGGER_SECRET_KEY` scoped to prod env of owner project; local dev needs `npm run trigger:v3:dev` running.
- F6: THE core fix — one env line unlocks the whole self-hosted plan layer.
- Loop hardening (2026-08-15): added token-minimization protocol + read-only
  `trigger-dev` MCP connector (`.opencode/opencode.json`). Both in LOOP.md.
- Dependency upgrade (2026-08-15): `@trigger.dev/*` 3.3.17 → 4.5.11 (per MANDATORY
  "never cling to outdated packages" rule). Ported code: trigger-time `queue` now a
  string (`trigger-utils.ts`), `prismaExtension` needs `mode: "legacy"`. `ai@2.2.37`
  kept via npm `overrides` — SEE DEPENDENCY DEBT below.

## Dependency debt ledger (tracked, not hidden)

Each entry: what's pinned, why, when to revisit. This is the systematic mechanism
for "upgrade blockers we had to defer" — everything here is surfaced in
`package.json` `overrides` AND listed here with a revisit trigger.

| # | Package | Pinned to | Blocker | Revisit trigger |
|---|---------|-----------|---------|-----------------|
| D1 | `ai` | 2.2.37 | App's Assistant chat (pages/[docId]/chat.tsx, view/[linkId]/chat.tsx) uses AI SDK v2 APIs (`experimental_AssistantResponse`, `useAssistant`) that were removed in v3+. `@trigger.dev/sdk@4.5.11` wants optional peer `ai@^5||^6||^7`. No OpenAI creds exist locally or on Vercel — feature is inert. | When implementing/activating the Assistant chat, OR when `ai@2.2.37` is flagged vulnerable, OR before upgrading anything that pulls `ai`. Port plan: either drop `ai` and stream via `openai` SDK directly (no vendor lock-in concern is moot since feature is OpenAI-only anyway) OR rewrite on AI SDK v7 Responses API. |
| D2 | `react-notion-x` | (its sub-dep `react-pdf` → 8.0.2) | `react-notion-x` declares a peer on `react-pdf` that conflicts with the app's version; the override pins `react-pdf@8.0.2` to satisfy it. Not an upgrade blocker — a dependency-resolution pin, present before this session. | When `react-notion-x` or `react-pdf` are next upgraded; verify the override can be removed. |

Rules for this ledger:
- Any `overrides` entry in package.json MUST have a matching row here.
- Run `npm audit` on every session touching deps; new HIGH/CRITICAL in a pinned
  package → move its row to the top with `REVISIT NOW`.
- When a blocker clears, do the port and delete the row + the override.

## Lessons learned (from interactions — feeds discovery probes)

| Lesson | Symptom | Probe that caught it | Where it hid |
|--------|---------|---------------------|--------------|
| L1 | Export visits spins forever | run QUEUED in Trigger.dev, no worker | It's a background task — API enqueues, worker must run (`npm run trigger:v3:dev` or deploy). |
| L2 | "Much of the app doesn't work" in self-host | `SELF_HOSTED_MODE` unset | The bypass layer exists but env flag never set (local + Vercel). |
| L3 | `npm install` fails after upgrading trigger.dev | ERESOLVE on `ai` peer (optional but strict npm) | Old app pin `ai@2.2.37` vs SDK's optional peer `^5-7`. Solved with overrides + debt ledger (D1), not a revert. |
| L4 | Vercel build fails after trigger.dev v4 bump | `module_compilation_error` | SDK v4 `skills.js` imports `node:` builtins; imported into client bundle via `generate-trigger-status.ts`. Fix: import `runMetadata` from `@trigger.dev/core/v3`. |
| L5 | `tsc` passes but Vercel build fails | Vercel `npm run vercel-build` runs full Next build | Typecheck ≠ bundle. Always run `npm run vercel-build` locally before pushing to auto-deploy. |
| L6 | Auto-discovery (probe P6) flags overrides without ledger rows | Every `overrides` entry must have a debt row | The `react-notion-x` override predated the ledger. |
| L7 | Loop design must cost-guard itself | Verification debt / comprehension rot / cognitive surrender / token blowout | Four guards added to LOOP.md; cost-per-accepted-change metric; human merge gate. |
| L8 | Model is image-blind (cannot read extracted frames/images) | Visual verification must NOT rely on "look at the screenshot" | Use deterministic checks (PIL text-bbox, OCR, ffprobe) OR watch-skill MCP `ask_video`/`get_moment` (text-first). Record the exact method in the finding. |
| L9 | Generic marketing ≠ acquirer concerns | "Share securely" doesn't speak to diligence teams | For client-facing copy, address the deal-side anxieties directly: NDA gating, watermarks, per-viewer permissions, audit trail, data residency. |
| L10 | Prod export fails while local works | "An error occurred while starting the export" in prod only | Vercel's `TRIGGER_SECRET_KEY` was empty. Prod env keys (`tr_prod_`) are dashboard-only (API keys page); CLI/API can't mint them. Probe P1b/P7 should flag empty TRIGGER keys on Vercel. |

## Run log

- Turn 1 (2026-08-15): DISCOVERY — F1 fixed, F2 fixed, F3 open, F5 diagnosed, F6 ROOT CAUSE found, F7 raw gate found, F8/F9 noted.
- Turn 2 (2026-08-15): F6 FIXED — set `NEXT_PUBLIC_SELF_HOSTED_MODE=true` on Vercel (prod+preview), `SELF_HOSTED_MODE=true` in local `.env`. Needs redeploy. Confirmed DB team plan is `"free"` (not enterprise) — self-hosted switch overrides it. Added Playwright MCP (verify-by-acting) + token-min protocol to loop.
- Turn 3 (2026-08-15): F2 properly done — `@trigger.dev/*` → 4.5.11, code ported (queue string, prisma mode), `ai@2.2.37` pinned via overrides + tracked in dependency debt ledger D1. Branches: `main`/`staging`/`develop` created + pushed. Vercel matrix documented. Vercel env var `NEXT_PUBLIC_SELF_HOSTED_MODE=true` set (prod+preview).
- Turn 4 (2026-08-15): Fix build error from v4 SDK client import (L4/L5) → `runMetadata` from core; all three envs READY at `bfa423de`. Loop hardened: four cost guards, debt ledger rules, discovery-skill.md, discovery.sh + `loop-discovery.yml` cron (auto-discovery + scheduling). L1–L7 lessons captured. Auto-discovery re-ran: confirms F7 (P3) + F9 (P2) OPEN, D2 ledger row added.
- Turn 5 (2026-08-15): F7 FIXED (visits.ts raw gate + visitors-table isFree), F9 FIXED (local brand video + login image, next.config cleanup). MCP verification made MANDATORY in LOOP.md; verified video with PIL text-bbox + ffprobe (model image-blind, L8). L8/L9 lessons added. F6 deploy confirmed all envs live.
- Turn 6 (2026-08-15): Back to PRIMARY INTENT (Export Visits) — found prod export POST fails: Vercel `TRIGGER_SECRET_KEY` EMPTY (F3 → BLOCKED on owner; needs `tr_prod_` key, dashboard-only). Added Focus & intent discipline (generic) + Priority tracker + Grenades to loop. G3 (webhook plan gates) fixed. Auto-discovery probes P2/P3 made context-aware; discovery now returns found=0.
