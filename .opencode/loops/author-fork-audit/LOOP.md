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

- **Manual**: explicit user request (primary today).
- **Auto-discovery (scheduled)**: GitHub Actions cron `loop-discovery.yml` runs daily
  at 06:00. It invokes the `author-fork-discovery` skill (see `discovery-skill.md`)
  read-only, writes findings to `state.md`/`state-archive.md`, and opens a GitHub
  issue ONLY when something new is found. It never commits code and never mutates
  external accounts. Local re-run: `.opencode/loops/author-fork-audit/discovery.sh`.
- The goal is open-ended and repeatable, so this document is the durable spec.

## Learning from interactions (MANDATORY)

The loop improves itself by learning what to look for:

1. Every time a novel class of finding appears (new author ref, new upstream account,
   new dead dependency, new plan gate), ADD the probe pattern to `discovery-skill.md`
   so future auto-discovery runs check it without being told.
2. Log the lesson in `state.md` → "Lessons learned" section: what was the symptom,
   what probe caught it, where it hid. One line each.
3. When a dependency is pinned via `overrides` or a blocker is deferred, it MUST get
   a row in the Dependency debt ledger (below) with a revisit trigger — never a bare
   override. "Pinning via overrides is like hiding it away; if there is no will or
   reason to look in its hiding place, it will be forgotten." The ledger IS the will.
4. A probe that finds nothing 3 runs in a row may be archived (moved to the "retired
   probes" list) to keep discovery lean — but keep its pattern in git history.

## The four costs of loop engineering (guards — MANDATORY)

The paper names four silent costs. This loop installs one guard per cost:

1. **Verification debt** — unverified output accumulates and blows up later.
   GUARD: the evaluator split (below) + "prove the verifier" — every new probe must
   first be shown to catch a REAL match (red) before it's trusted to gate (green).
   Cost metric: **cost per accepted change** — track approximate tokens spent vs
   findings FIXED; if it rises across turns, stop and re-scope.
2. **Comprehension rot/debt** — code ships faster than the owner's mental map.
   GUARD: after each turn, write a one-paragraph "what changed and why" in
   `state.md` run log (not just statuses). The owner reads it. A change you cannot
   explain is a map needing an update.
3. **Cognitive surrender** — the loop runs so smoothly the owner stops judging.
   GUARD: every turn ends with a human checkpoint: the owner reviews the diff
   before merge to `main`. The loop can execute, but it cannot decide. Never
   auto-merge to `main`; never auto-mutate external accounts.
4. **Token blowout** — idle bugs burn budget all night.
   GUARD: hard caps set BEFORE running unattended: max 10 findings per discovery
   run, max 5 full file reads per turn, max 3 tool-output dumps per turn, and the
   scheduler's issue-opener only fires on new findings. A loop without caps has
   delegated its spending authority to its own bugs.

These four guards are the standing answers to: verification debt → evaluator +
proven verifier; comprehension debt → explain-in-plain-text per turn; cognitive
surrender → human merge gate; token blowout → caps + cost-per-accepted-change.

## Dependency debt ledger (MANDATORY)

Held in `state.md` → "Dependency debt ledger". Rules:

- Any `overrides` entry in package.json MUST have a matching row here with a
  revisit trigger (what condition makes it safe/urgent to do the real upgrade).
- Run `npm audit` on every session touching deps; a new HIGH/CRITICAL in a pinned
  package moves that row to "REVISIT NOW".
- When the blocker clears, do the port and DELETE the row + the override.
- Ledger rows are visible in every session because AGENTS.md protocol reads
  project-state and the loop state.

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
5. SCHEDULING — auto-discovery (cron) wakes the loop daily; unfinished findings
   persist in state files across turns/sessions and carry into the next run.

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
