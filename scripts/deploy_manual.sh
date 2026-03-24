#!/usr/bin/env bash
set -euo pipefail

echo "==> 手动部署到 Vercel（生产）"

if ! command -v vercel >/dev/null 2>&1; then
  echo "未检测到 vercel CLI，请先安装并登录。"
  exit 1
fi

if [ ! -f ".env.local" ]; then
  echo "未找到 .env.local，请先配置环境变量。"
  exit 1
fi

echo "==> 运行内容校验"
npm run content:validate

echo "==> 运行构建检查"
npm run build

echo "==> 执行 Vercel 生产部署"
vercel deploy --prod

echo "部署完成。"
