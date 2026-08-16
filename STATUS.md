# STATUS REPORT — omp-papermark (for the operator)

Updated: 2026-08-16 · All branches at `46373a484` · Production deploying.

This is your mental-model sync doc. Read it to be current with the codebase.
Regenerated at the end of every work session (see loop move #5 below).

## What's live right now

| Thing | State | Evidence |
|-------|-------|----------|
| Production app | LIVE at https://dealroom.open-mic.co.za | login page renders white-label |
| Branches | develop = staging = main = `46373a484` | `git rev-parse --short` |
| Vercel prod deploy | QUEUED for `46373a48` (auto) | API check |
| trigger.dev worker | deployed `20260816.1` (12 tasks) | CLI deploy output |
| Tinybird | 5 datasources + 13 pipes live (Forward) | HTTP API verified |
| Export Visits (primary intent) | COMPLETED end-to-end | run + CSV on R2 |
| PDF conversion | COMPLETED (5 pages, hasPages:true) | trigger run |

## Credential rotation (2026-08-16)

- **trigger.dev prod key** rotated. New key on Vercel + worker (redeployed). Old key
  in trigger.dev grace period (revoked but briefly valid — expected).
- **R2 secret** rotated (access key unchanged). New secret on local `.env`, Vercel
  (prod+preview), worker. Verified read/write.
- No real credentials in git history (purged) or tracked files (gitleaks clean).
  Keys live ONLY in `.env`/platform stores.

## What was fixed this session (the big items)

1. **Tinybird Forward migration** — resources renamed to `__vN` filenames, `TYPE ENDPOINT`
   added, deployed + verified. Analytics ingest now works.
2. **Uploads failing with `[object Object]`** — root cause was trigger.dev worker missing
   DB env vars (all conversion runs died at Prisma init). Fixed worker env; conversions
   no longer block uploads. Duplicate-name uploads now show Rename/Overwrite dialog.
3. **R2 CopyObject bug** — `onUploadFinish` used a CopySource one level short for R2's
   baked-in `papermark/` key prefix → PATCH 500'd even though files uploaded. Fixed both
   tus routes with a fallback. Verified PATCH 204.
4. **Export Visits (the original goal)** — root cause was Tinybird `baseUrl` defaulting to
   the wrong host (`api.tinybird.co` vs `api.eu-west-1.aws.tinybird.co`) → "Unauthorized".
   Fixed in 3 client instantiations. Export now COMPLETES and the CSV lands on R2.
5. **Login/verify pages** — premium studio-console redesign with counterparty-focused
   copy (RBAC, per-viewer permissions, watermarks, audit trail) and defensible compliance
   claims (SOC 2 certified infra, AES-256, TLS). NDA point removed per your direction.
6. **Pipe-hang root cause fixed** — background processes were holding the shell's output
   pipe open, causing phantom timeouts on fast commands. `gtimeout` + global shell-strategy
   rules now prevent it.

## Security guard rails (RULE #1 — never commit credentials)

- `gitleaks` pre-commit + pre-push hooks on this repo AND every repo on this machine
  (global git template at `~/.config/git-templates/hooks/`).
- Global opencode `AGENTS.md` has a mandatory SECRETS GUARD-RAILS section (loads every
  session, every project).
- Git history purged of the leaked credentials (git-filter-repo + force-push).
- Loop discovery probe P8 scans for secrets on every run.

## Still open / needs your input

1. **DOC/DOCX/PPT → PDF conversion needs a Gotenberg/LibreOffice service.**
   `NEXT_PRIVATE_CONVERSION_BASE_URL` + `NEXT_PRIVATE_INTERNAL_AUTH_TOKEN` are configured
   NOWHERE. PDF uploads work; Word/PowerPoint uploads will not convert until provisioned.
   Options: hosted Gotenberg, a LibreOffice build-extension in the worker, or accept the gap.
2. `REVALIDATE_TOKEN` missing everywhere (non-blocking revalidate step).
3. Old trigger.dev prod key in grace period — will stop working on its own; no action needed.

## Loop: how this report stays systematic

Per the loop-engineering paper (persistence move), at the END of every session I will:
1. Sync all branches (develop → staging → main).
2. Update this STATUS REPORT + `.opencode/project-state.md` with what changed.
3. Run `gitleaks detect` (secret guard).
4. Run loop discovery (`discovery.sh`) — surface any new findings.
5. Give you the "what changed / what's live / what's blocked" summary so your mental
   model never lags the codebase.

If you ever want a fresh report mid-session, just say "report" or "status".
