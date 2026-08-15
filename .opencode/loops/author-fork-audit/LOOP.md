# LOOP: author-fork-audit

Description: Find and fix every hardcoded key/config/account that still points to
the upstream papermark author's project, so this self-hosted fork runs entirely on
the owner's own accounts (production). Also remove any enterprise/premium
subscription gates that are inappropriate for self-hosting.

Use when: user says "self-hosted broken", "points to the author's project",
"whitelabel", "hardcoded keys", or reports a feature that doesn't work that
depends on a cloud account.

Source: Loop Engineering: The Anthropic Playbook (HuaShu, 2026) — five moves:
discovery, handoff, verification, persistence, scheduling. Generator/evaluator
split: a separate skeptical check must be able to say "no".

## Trigger

Manual: explicit user request. Goal is ambitious and open-ended — repeatable,
so this document is the durable spec. (Scheduling: a future cron could re-run
discovery only; not yet wired.)

## Goal (verifiable)

Goal: ZERO hardcoded references to the upstream author's accounts remain in the
repo and in deployed config. Verification is deterministic per finding:
`grep`/`rg` must return no match for the upstream token/ref/domain in question.

## One turn (execution)

1. DISCOVERY — grep repo + `.env` + deployed cloud config for:
   - `proj_*` Trigger.dev refs (upstream `proj_plmsfqvqunboixacjjus`)
   - `tr_*` Trigger.dev secret keys, `tr_pat_*`, `tr_dev_*`
   - upstream author domain/emails (`papermark.io`, `marcseibert`, etc.)
   - upstream SaaS keys embedded in code (not just `.env`)
   - plan gates: `plan === "free"`, `isSelfHostedMode()`, `team.plan` checks
   - hardcoded `BLOB_READ_WRITE_TOKEN`, resend/unsend keys, stripe, tinybird
2. HANDOFF — each finding becomes one surgical change; do not bundle.
3. VERIFICATION — the evaluator (fresh skeptical pass, different focus than the
   maker): re-grep the exact finding, `npx tsc --noEmit`, and cloud API checks
   where deployable. A finding is FIXED only when the check says no match.
4. PERSISTENCE — update `.opencode/project-state.md` (deployments, HEAD,
   decisions) and `.opencode/knowledgebase.md` LAST_INDEXED after each fix.
5. SCHEDULING — the loop's memory is this file + state files; unfinished
   findings persist across turns/sessions.

## Verification (the check that can say "no")

- L1 deterministic: `rg`/`grep` returns no match for the specific token/ref.
- L1 deterministic: `npx tsc --noEmit` passes.
- L3 delayed/field: `tb --cloud deploy --check` and Trigger.dev deploy succeed.
- Never trust "I searched and saw nothing" without the actual command output.

## Terminal states

- SUCCESS — all discovered findings fixed and verified (grep clean, tsc clean).
- BLOCKED — a finding cannot be fixed without owner credentials/info (e.g. new
  Stripe webhook URL); leave a clear note + exact input needed, stop, report.
- STALLED — two consecutive turns made no progress; report and stop.
- EXHAUSTED — budget/cost ceiling hit; report partial results.

## Guardrails

- Do NOT change auth/security controls to "fix" a gate; that fails closed.
- Do NOT print real secrets to the terminal or into files — redact to prefix.
- Do NOT commit; report changes and let the owner commit (or ask).
- One finding per turn (Family B: act without breaking what works).
- Human review point: any new account/setup step (create Stripe webhook,
  mint production Trigger token) pauses for the owner — never auto-mutate
  external accounts.
- **Never revert a dependency to dodge an upgrade (MANDATORY).** If a package is
  pinned and outdated/conflicting: upgrade it and port the code to the new API.
  A `peerOptional` conflict is not a reason to keep an old version — resolve it by
  updating the dependency (and its consumers) or documenting a real blocker in
  project-state.md. Never "fix" an upgrade by un-upgrading.

## Token minimization (MANDATORY)

This loop runs inside a limited context window; compaction must not degrade it.
Operate as "symbols over content, deltas over dumps":

1. NEVER paste a whole file or whole tool output into this conversation. Read
   with `offset`/`limit`, or `rg` for the exact lines. The output log is the
   only place full content may live.
2. Use the knowledgebase: check `.opencode/knowledgebase.md` for the symbol
   location BEFORE reading a file. Read a file only when editing it.
3. State files are compressed by design: `state.md` stores one line per finding
   (id, status, evidence), never transcripts. Appending a row < 20 tokens.
4. Verification is a grep/`rg` returning line counts, not file dumps. "FIXED"
   means the command output was seen, not asserted.
5. Discovery is incremental: grep only the NEW probe pattern this turn, diff
   against the ledger, and update just the changed rows.
6. Compress the ledger itself when it exceeds ~40 rows: archive `FIXED` rows to
   `state-archive.md` in bulk (one bash append), keep only OPEN/BLOCKED/NOTE.
7. Do not re-verify a finding already marked FIXED unless its file changed.
8. Budget ceiling: if a single turn would require reading > 5 full source files
   or > 3 full tool outputs, stop and re-scope (sub-loop or narrower grep).
9. Prefer `rg` over reading directories; prefer reading 1 file over globbing 10.
10. The evaluator re-checks with the smallest evidence: exact grep pattern +
    `npx tsc --noEmit` (which prints only errors), never re-reading edited files.

## Memory

- This file (LOOP.md) — the spec.
- `state/` next to this file — per-finding ledger: status, evidence, blocked inputs.
- `.opencode/project-state.md` — global live state (git HEAD, deployments).
- `.opencode/knowledgebase.md` — symbol index, LAST_INDEXED.

## Connectors (MCP)

Read-only MCP servers keep external state out of the context window until needed:
- `trigger-dev` (local, `trigger.dev mcp --readonly`) — query Trigger.dev runs,
  tasks, environments without CLI output dumping. Registered in
  `.opencode/opencode.json`. Write tools (deploy/trigger/cancel) are hidden.
- Loop discipline: call the MCP to answer a specific run/deploy question, then
  persist only the answer line in `state.md`. Do not paste raw MCP dumps here.
- Adding more read-MCPs (e.g. Upstash Redis REST, Postgres via `psql -c`) is
  welcome when a finding needs it — but always read-only and registered in
  `.opencode/opencode.json`, never ad-hoc credentials in this file.

## Why it works (mapped to failure modes)

- Evaluator separated from generator → avoids the Nodding loop (self-approval).
- State on disk → avoids the Amnesiac loop (context flush loses progress).
- Manual trigger documented + future schedule → avoids the Manual loop.
- Discovery is a grep corpus, not a wall of instructions → avoids the Blind loop.
- One finding per turn → avoids the Tangled loop (no parallel collisions).
