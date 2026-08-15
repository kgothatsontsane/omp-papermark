# discovery-skill: author-fork-audit discovery

NAME: author-fork-discovery
WHEN: invoked by the daily cron (loop-discovery.yml) or manually.
MODE: read-only. Never edits, never commits, never mutates accounts.

## Purpose
Surface hardcoded upstream-author refs, dead deps, and self-hosted config gaps
in this forked app. Write findings to state.md, one row per finding.

## Read (discovery inputs)
- git log since last run (`git log --oneline --since="2 days ago"`)
- package.json + package-lock.json (deps pinned via overrides, versions)
- `.env` / `.env.example` (missing SELF_HOSTED_MODE etc.)
- the previous state.md (what was open, what changed)

## Probes (the corpus — grows via "learning from interactions")

### P1 Trigger.dev refs
- `rg -n "proj_[a-z0-9]+" trigger.config.ts` — must equal owner's `proj_palqkhramjxoleaduwuu`
- `rg -n "tr_(dev|_pat|prod|_run|_key)_" --glob '!.env'` — no secrets in code
- `rg -n "TRIGGER_SECRET_KEY=" .env` — must be owner-scoped, not upstream

### P2 Upstream author domains/emails
- `rg -n -i "papermark\.io|marcseibert|@papermark" --glob '!node_modules/**' --glob '!public/**'`

### P3 Plan gates that ignore self-hosted
- `rg -n "plan === \"free\"|plan === 'free'|plan === \"enterprise\"" pages lib components app ee`
  — each must be guarded by `!isSelfHostedMode()` or use the self-hosted-aware helpers

### P4 Self-hosted mode flag
- `grep -c "SELF_HOSTED_MODE" .env .env.example` — must be true in local + Vercel
  (Vercel check via API: NEXT_PUBLIC_SELF_HOSTED_MODE=true on production + preview)

### P5 Hardcoded SaaS keys in code
- `rg -n "sk_(live|test)_[A-Za-z0-9]{10,}|pk_live_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{20,}" --glob '!node_modules/**' --glob '!.env'`

### P6 Dependency debt (dead/pinned deps)
- Read `overrides` block in package.json; each must have a ledger row in state.md
- `npm audit --audit-level=high` — new HIGH/CRITICAL in a pinned package → REVISIT NOW

### P7 Vercel env drift
- Compare local `.env` keys vs Vercel project env keys (production) — missing keys
  mean the feature works locally but breaks in prod. (Uses Vercel API token from session.)
- Specifically flag EMPTY secrets that must be set for prod: `TRIGGER_SECRET_KEY`
  (task.trigger() fails if empty), `TINYBIRD_TOKEN`, `RESEND_API_KEY`,
  `BLOB_READ_WRITE_TOKEN`. Trigger.dev keys are per-env (`tr_prod_` = dashboard-only).

### P8 Secrets in tracked files (RULE #1)
- Run `gitleaks detect --source . --no-banner` — ANY hit is a BLOCKING finding.
- `rg -n "tr_(dev|prod|stg|pat)_[A-Za-z0-9]{8,}|sk_live_|AKIA[0-9A-Z]{16}" --glob '!node_modules/**' --glob '!.env' --glob '!.git/**' .`
- Check state files specifically: `rg -n "(TRIGGER|R2|API|SECRET|KEY).{0,40}=[A-Za-z0-9_-]{16,}" .opencode/`
- A credential in ANY tracked file is a FINDING with severity CRITICAL — the agent
  must rotate the key and purge history (filter-repo), never just redact.

### Retired probes
- (none yet)

## Judge
For each match: is it actionable? Skip noise (docs, git history, sample config).
Keep only real findings. Categorize: AUTHOR_REF | PLAN_GATE | DEP_DEBT | ENV_DRIFT | SECRET.

## Output
- Append rows to `.opencode/loops/author-fork-audit/state.md` findings ledger.
- If any NEW finding (not already in ledger): the cron opens a GitHub issue with
  the finding list. If nothing new: silent no-op (SUCCESS / NOOP terminal state).

## Learning
- A novel finding class → add its probe here (P8, P9...) and a one-line lesson to
  state.md "Lessons learned". This is how the loop learns from our interactions.
