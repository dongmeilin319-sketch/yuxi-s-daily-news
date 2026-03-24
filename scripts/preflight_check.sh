#!/usr/bin/env bash
set -euo pipefail

PASS_COUNT=0
FAIL_COUNT=0

check_cmd() {
  local cmd="$1"
  local label="$2"
  if command -v "${cmd}" >/dev/null 2>&1; then
    echo "✅ ${label}: $(command -v "${cmd}")"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ ${label}: 未安装"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

check_version() {
  local cmd="$1"
  local label="$2"
  local args="$3"
  if command -v "${cmd}" >/dev/null 2>&1; then
    # shellcheck disable=SC2086
    echo "   版本 -> $(${cmd} ${args} 2>/dev/null | head -n 1)"
  fi
}

echo "==> 工具检查"
check_cmd "node" "Node.js"
check_cmd "npm" "npm"
check_cmd "pnpm" "pnpm"
check_cmd "python3" "Python3"
check_cmd "pip3" "pip3"
check_cmd "git" "Git"
check_cmd "gh" "GitHub CLI"
check_cmd "vercel" "Vercel CLI"
check_cmd "jq" "jq"
check_cmd "docker" "Docker"

check_version "node" "Node.js" "-v"
check_version "npm" "npm" "-v"
check_version "pnpm" "pnpm" "-v"
check_version "python3" "Python3" "--version"
check_version "pip3" "pip3" "--version"
check_version "git" "Git" "--version"
check_version "gh" "GitHub CLI" "--version"
check_version "vercel" "Vercel CLI" "--version"

echo
echo "==> 登录状态检查"
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    echo "✅ GitHub CLI 已登录"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ GitHub CLI 未登录（执行: gh auth login）"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
fi

if command -v vercel >/dev/null 2>&1; then
  if vercel whoami >/dev/null 2>&1; then
    echo "✅ Vercel CLI 已登录"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ Vercel CLI 未登录（执行: vercel login）"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
fi

echo
echo "==> 环境变量文件检查"
if [ -f ".env.local" ]; then
  echo "✅ .env.local 已存在"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ .env.local 不存在（先复制 .env.example）"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo
echo "检查完成：通过 ${PASS_COUNT} 项，失败 ${FAIL_COUNT} 项"
if [ "${FAIL_COUNT}" -gt 0 ]; then
  exit 1
fi
