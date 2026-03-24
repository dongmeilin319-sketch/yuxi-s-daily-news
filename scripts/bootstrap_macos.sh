#!/usr/bin/env bash
set -euo pipefail

echo "==> AI News 项目环境初始化（macOS）"

if ! command -v xcode-select >/dev/null 2>&1; then
  echo "xcode-select 不存在，请检查系统环境。"
  exit 1
fi

if ! xcode-select -p >/dev/null 2>&1; then
  echo "==> 安装 Xcode Command Line Tools..."
  xcode-select --install || true
  echo "请完成弹窗安装后，重新执行本脚本。"
  exit 0
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "==> 安装 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [ -d "/opt/homebrew/bin" ]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "${HOME}/.zprofile"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -d "/usr/local/bin" ]; then
    echo 'eval "$(/usr/local/bin/brew shellenv)"' >> "${HOME}/.zprofile"
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

echo "==> 更新 Homebrew..."
brew update

echo "==> 安装核心工具..."
brew install node pnpm gh jq
brew install python@3.12
brew install --cask docker

echo "==> 安装 Vercel CLI..."
npm install -g vercel

echo "==> 安装 Python 虚拟环境工具..."
python3 -m pip install --user virtualenv

echo "==> 初始化完成。建议下一步："
echo "1) 运行 scripts/preflight_check.sh 进行自检"
echo "2) 执行 gh auth login && vercel login"
echo "3) 复制 .env.example 为 .env.local 并填入密钥"
