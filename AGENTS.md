# AGENTS.md — omp-papermark project memory

Stable project knowledge. Loaded automatically at every session start. This file
survives context compaction/compression — it is the durable record that keeps
output quality constant across sessions.

## State protocol (MANDATORY)

- **Read** `.opencode/project-state.md` at the start of every task before doing work.
- **Check** `.opencode/knowledgebase.md` for module/symbol/pattern index before reading
  source files repeatedly (implements the `codebase-knowledgebase` skill — symbols over content).
- **Update** `.opencode/project-state.md` at the end of every task whenever
  anything changed: deployments, git HEAD, decisions, verification results, new gotchas.
- **Refresh** `.opencode/knowledgebase.md` LAST_INDEXED + affected modules after significant changes.
- Never let a session end with state that differs from `.opencode/project-state.md`.
- If the state file is missing or stale, rebuild it from git log + this file.

## Project overview

Next.js (App Router) fork of Papermark — document/dataroom sharing with per-view
analytics. Monorepo-style single app. TypeScript, Prisma (Postgres), NextAuth,
Vercel deployment, Tinybird for analytics events.

## Architecture map (key paths)

- `lib/tracking/record-link-view.ts` — view ingest entry point. Builds `clickData`,
  then `Promise.all` of: Tinybird ingest (graceful-degraded, see below), email
  notification, webhook delivery.
- `lib/tinybird/` — Tinybird resources + client:
  - `publish.ts` — ingest functions (`recordLinkViewTB`, etc.). Datasource ingest names.
  - `pipes.ts` — `buildPipe` definitions. Endpoint names + params.
  - `index.ts` — exported client/helpers.
  - `datasources/*.datasource`, `endpoints/*.pipe` — the deployed resource files.
- `lib/api/views/send-webhook-event.ts` — webhook delivery.
- `lib/api/notification-helper.ts` — email notifications.
- `lib/utils.ts` — exports `log({ message, type })`.
- `app/`, `pages/`, `components/`, `ee/`, `prisma/` — standard Next.js papermark layout.

## Critical gotchas (do not relearn these)

### The app runs on Vercel (production)
- Production is deployed on **Vercel** at https://dealroom.open-mic.co.za.
- Production env vars come from **Vercel project settings**, NOT local `.env`.
  Local `.env` only affects local dev. Change a var → update Vercel env → redeploy.
- `vercel whoami`/login hangs interactively; prefer non-interactive flags or the dashboard.

### Tinybird is a FORWARD workspace (not Classic)
- Workspace `OMP_Papermark`, region `aws eu-west-1`. Base URL `https://api.eu-west-1.aws.tinybird.co`.
- Token in `.env` as `TINYBIRD_TOKEN` (HTTP API). CLI env vars are `TB_TOKEN`/`TB_HOST`.
- **Forward ignores `VERSION` in `.datasource`/`.pipe` files — resources are named by FILENAME.** The Classic-era versioning trick (`page_views.datasource` → `page_views__v3`) was implemented by renaming files. Do NOT add `VERSION` lines expecting them to work.
- Forward requires explicit `TYPE ENDPOINT` at the end of every pipe file to expose an API endpoint.
- Classic CLI (`uvx --from tinybird-cli@latest tb`) refuses Forward workspaces. Forward CLI installed via `uv` is `tb` v4.6.x.
- `tb deploy` alone targets Tinybird Local (needs Docker). Must use:
  `tb --cloud --token "$TB_TOKEN" --host "$TB_HOST" deploy` from `lib/tinybird/`.
- Pipe `FROM` clauses must reference the FILENAME (versioned) datasource names.

### Graceful degradation principle
- Never fail open on SECURITY controls (auth, authz, rate-limit, ownership checks).
- Only degrade NON-security features (analytics/telemetry/UX), and always log each
  degradation event via `log({ ..., type: "error" })`.
- Pattern in `record-link-view.ts`: Tinybird ingest is wrapped in try/catch so an
  outage never blocks email notification or webhook delivery.

## Conventions

- Commit style: `fix: <imperative summary>` (see `git log`).
- TypeScript strict. Typecheck before finishing: `npx tsc --noEmit`.
- No comments in code unless asked; no emojis unless asked.
- Keep changes minimal — this codebase favors small, surgical fixes.
- **Never cling to outdated/unpatched packages (MANDATORY).** When a dependency is
  pinned and a newer version exists (especially if flagged vulnerable, or a
  peer-conflict forces a decision): upgrade it and update the code to the new API,
  rather than reverting the dependency to keep old code. Same for the CLI and
  any toolchain. If a true blocker exists, document it in project-state.md, don't
  silently revert. Exceptions only for a pinned native/platform requirement.
- **Branch/environment protocol (MANDATORY):** `main` = production,
  `staging` = staging, `develop` = development. Feature work happens on
  `develop` → merges flow up. Never commit directly to `main` for feature work.
  Vercel maps each branch to its own environment.
- **Always show verification links (MANDATORY):** after completing a task that has
  a viewable artifact (deployment, endpoint, PR, dashboard), output the relevant
  link(s) + a status list (production/staging/development/deployed/pending).
  Never end a task with "it's done" and no way to verify it.

## Verification

- `npx tsc --noEmit` for typecheck.
- Tinybird verify: `curl "https://api.eu-west-1.aws.tinybird.co/v0/datasources/?token=$TOK"` and `/v0/pipes/?token=$TOK`.
