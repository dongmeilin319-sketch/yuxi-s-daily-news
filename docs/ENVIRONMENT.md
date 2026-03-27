# 环境变量说明

按用途分组。本地可写在仓库根目录 `.env.local`（勿提交）；Vercel / GitHub Actions 在各自后台配置。

## 站点与 SEO

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 生产强烈建议 |  canonical 根 URL，`https://域名`，无尾斜杠。Vercel 未设时会回退 `https://$VERCEL_URL`。 |

## 安全与定时任务

| 变量 | 必填 | 说明 |
|------|------|------|
| `CRON_SECRET` | 生产建议 | 设置后，`/api/cron/daily` 须带 `Authorization: Bearer <CRON_SECRET>` 或头 `x-cron-secret: <CRON_SECRET>`。Vercel Cron 在项目里配置同名变量后，请求会自动带 Bearer。未设置时接口仍开放（仅便于本地调试）。 |

## 邮件订阅（可选）

| 变量 | 必填 | 说明 |
|------|------|------|
| `SUBSCRIBE_WEBHOOK_URL` | 否 | 收到订阅 POST 时转发 JSON：`{ email, source, at }`。 |

## 内容归档

| 变量 | 必填 | 说明 |
|------|------|------|
| `ARCHIVE_DAYS` | 否 | `archive-old-content.mjs` 阈值天数，默认 `30`。GitHub Actions 可通过仓库 **Variables** `ARCHIVE_DAYS` 注入。 |

## OpenClaw（Python `openclaw/run_once.py`）

| 变量 | 必填 | 说明 |
|------|------|------|
| `ANTHROPIC_API_KEY` 或 `CLAUDE_API_KEY` | 跑流水线时 | Anthropic API Key。 |
| `ANTHROPIC_MODEL` | 否 | 默认 `claude-3-5-sonnet-20241022`。 |
| `CONFIDENCE_NEED_REVIEW` | 否 | 低于该置信度的文章写入 `content/review`，默认 `0.7`。 |
| `GITHUB_TOKEN` | push 时 | PAT，`repo` 权限。 |
| `GITHUB_OWNER` | push 时 | 组织或用户名。 |
| `GITHUB_REPO` | push 时 | 仓库名。 |
| `GITHUB_BRANCH` | 否 | 默认 `main`。 |

## Vercel CLI / 仪表盘（可选）

| 变量 | 说明 |
|------|------|
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | 仅在使用 CLI 或集成时需要。 |

## 其他占位（后续管线）

| 变量 | 说明 |
|------|------|
| `FEISHU_WEBHOOK_URL` / `WECHAT_WEBHOOK_URL` | 告警与通知（尚未接入代码）。 |
