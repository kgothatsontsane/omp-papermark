#!/usr/bin/env bash
# Loop discovery — read-only sweep for the author-fork-audit loop.
# Runs on a cron (GitHub Actions) or manually. Never edits, never commits.
# Output: writes .opencode/loops/author-fork-audit/last-findings.txt (new findings
# only) and echoes found=true/false for the workflow.

set -uo pipefail
cd "$(dirname "$0")/../../.." || exit 1

LEDGER=".opencode/loops/author-fork-audit/state.md"
OUT=".opencode/loops/author-fork-audit/last-findings.txt"
: > "$OUT"

findings=0
emit() {
  printf '%s\n' "$*" >> "$OUT"
  findings=1
}

# P1 Trigger.dev project ref must be the owner's
if rg -q 'proj_palqkhramjxoleaduwuu' trigger.config.ts 2>/dev/null; then
  :
else
  emit "P1: trigger.config.ts project ref is not owner's proj_palqkhramjxoleaduwuu"
fi

# P1b trigger secrets in code
if rg -n 'tr_(dev|_pat|prod|_run|_key)_[A-Za-z0-9]{6,}' --glob '!node_modules/**' --glob '!.env' --glob '!package-lock.json' . 2>/dev/null | grep -qv '\.opencode/'; then
  emit "P1: trigger.dev secret key found in source (excl .env)"
fi

# P2 upstream author domains
if rg -n -i 'papermark\.io|marcseibert' --glob '!node_modules/**' --glob '!public/**' --glob '!*.lock' . 2>/dev/null | grep -q .; then
  emit "P2: upstream papermark.io / author refs still in repo (see rg output)"
fi

# P3 plan gates not self-hosted-guarded
if rg -n 'plan === "free"|plan === '"'"'free'"'"'' pages components app ee lib 2>/dev/null | rg -v 'isSelfHostedMode|self-hosted|getEffectivePlan|isFreePlan' | grep -q .; then
  emit "P3: unguarded plan===\"free\" gate found (needs !isSelfHostedMode())"
fi

# P5 hardcoded SaaS keys
if rg -n 'sk_(live|test)_[A-Za-z0-9]{10,}|pk_live_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{20,}' --glob '!node_modules/**' --glob '!.env' --glob '!*.lock' . 2>/dev/null | grep -q .; then
  emit "P5: hardcoded SaaS key pattern found in source (excl .env)"
fi

# P6 overrides in package.json must have a ledger row
if grep -q '"overrides"' package.json 2>/dev/null; then
  ovr=$(node -e "try{console.log(Object.keys(require('./package.json').overrides||{}).join(','))}catch(e){console.log('')}" 2>/dev/null)
  for k in ${ovr//,/ }; do
    if ! grep -q "$k" "$LEDGER" 2>/dev/null; then
      emit "P6: package.json override '$k' has no dependency-debt ledger row"
    fi
  done
fi

echo "found=$findings"
exit 0
