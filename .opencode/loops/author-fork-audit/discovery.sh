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

# P2 upstream author domains (exclude docs/ which mention them as "don't use")
if rg -n -i 'papermark\.io|marcseibert' --glob '!node_modules/**' --glob '!public/**' --glob '!*.lock' --glob '!docs/**' . 2>/dev/null | grep -q .; then
  emit "P2: upstream papermark.io / author refs still in repo (see rg output)"
fi

# P3 plan gates not self-hosted-guarded
# For each `plan === "free"` match, check the 3 preceding lines for a self-host guard.
P3_RESULT=$(python3 <<'PY'
import re, subprocess
files = subprocess.run(
    ["rg", "-l", 'plan === "free"', "pages", "components", "app", "ee", "lib"],
    capture_output=True, text=True).stdout.split()
bad = []
for f in files:
    try:
        lines = open(f).read().splitlines()
    except (OSError, UnicodeDecodeError):
        continue
    for i, ln in enumerate(lines):
        if re.search(r'plan === "free"', ln):
            # pages/branding.tsx is a client upgrade prompt using usePlan
            # (self-hosted-aware) - not a server gate. Skip it.
            if f.endswith("branding.tsx"):
                continue
            ctx = "\n".join(lines[max(0, i-3):i+1])
            if not re.search(r'isSelfHostedMode|self-hosted|getEffectivePlan|isFreePlan', ctx):
                bad.append(f"{f}:{i+1}")
print("\n".join(bad[:10]))
PY
)
if [ -n "$P3_RESULT" ]; then
  emit "P3: unguarded plan===\"free\" gate found: $P3_RESULT"
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

# P7 TRIGGER_SECRET_KEY must not be empty in .env (Vercel checked via API manually)
if ! grep -qE '^TRIGGER_SECRET_KEY=.+' .env 2>/dev/null; then
  emit "P7: TRIGGER_SECRET_KEY is missing or empty in .env"
fi

echo "found=$findings"
exit 0
