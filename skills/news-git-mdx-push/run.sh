#!/usr/bin/env bash
set -euo pipefail

# Skill entrypoint: generate MDX from multiple configured sources,
# then (optionally) it will commit+push to trigger Vercel refresh.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT_COMPUTED="$(cd "$SKILL_DIR/../.." >/dev/null 2>&1 && pwd)"
REPO_ROOT="${TARGET_REPO_ROOT:-$REPO_ROOT_COMPUTED}"

# Inputs (via env vars; can be injected by OpenClaw skills config or user prompt)
# If SOURCE_INDEX is set, only ingest that entry; otherwise ingest all in openclaw/sources.json.
SOURCE_INDEX="${SOURCE_INDEX:-}"
NO_PUSH="${NO_PUSH:-false}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

# Optional: run npm validation after generation (can be slow / requires node)
RUN_VALIDATE="${RUN_VALIDATE:-false}"
DRY_RUN="${DRY_RUN:-false}"
NEUTRALITY_CHECK="${NEUTRALITY_CHECK:-true}"

# Production tuning (optional)
HOURS="${HOURS:-24}"
MAX_ITEMS="${MAX_ITEMS:-}"
MAX_LINKS_PER_SOURCE="${MAX_LINKS_PER_SOURCE:-}"
DEDUP_TITLE_THRESHOLD="${DEDUP_TITLE_THRESHOLD:-}"
DEDUP_TIME_HOURS="${DEDUP_TIME_HOURS:-}"

cd "$REPO_ROOT"

PY_BIN="python3"
if [[ -x "$REPO_ROOT/openclaw/.venv/bin/python" ]]; then
  PY_BIN="$REPO_ROOT/openclaw/.venv/bin/python"
fi

NO_PUSH_FLAG=""
if [[ "$NO_PUSH" == "true" || "$NO_PUSH" == "1" ]]; then
  NO_PUSH_FLAG="--no-push"
fi

# Ensure generator pushes to the intended branch.
# (openclaw/run_once.py reads GITHUB_BRANCH, defaulting to "main".)
export GITHUB_BRANCH="${GITHUB_BRANCH:-$TARGET_BRANCH}"

echo "[news-git-mdx-push] repo_root=$REPO_ROOT"
echo "[news-git-mdx-push] source_index=${SOURCE_INDEX:-'(all)'} no_push=$NO_PUSH_FLAG validate=$RUN_VALIDATE dry_run=$DRY_RUN"

ARGS=()
if [[ -n "$SOURCE_INDEX" ]]; then
  ARGS+=(--source-index "$SOURCE_INDEX")
fi

ARGS+=(--hours "$HOURS")

if [[ "$DRY_RUN" == "true" || "$DRY_RUN" == "1" ]]; then
  ARGS+=(--dry-run)
fi
ARGS+=($NO_PUSH_FLAG)

if [[ "$NEUTRALITY_CHECK" == "true" || "$NEUTRALITY_CHECK" == "1" ]]; then
  ARGS+=(--neutrality-check)
fi

if [[ -n "$MAX_ITEMS" ]]; then
  ARGS+=(--max-items "$MAX_ITEMS")
fi
if [[ -n "$MAX_LINKS_PER_SOURCE" ]]; then
  ARGS+=(--max-links-per-source "$MAX_LINKS_PER_SOURCE")
fi
if [[ -n "$DEDUP_TITLE_THRESHOLD" ]]; then
  ARGS+=(--dedup-title-threshold "$DEDUP_TITLE_THRESHOLD")
fi
if [[ -n "$DEDUP_TIME_HOURS" ]]; then
  ARGS+=(--dedup-time-hours "$DEDUP_TIME_HOURS")
fi

$PY_BIN skills/news-git-mdx-push/ingest_day.py "${ARGS[@]}"

if [[ "$RUN_VALIDATE" == "true" || "$RUN_VALIDATE" == "1" ]]; then
  npm run content:validate
fi

