# OpenClaw MVP（Python）

最小流水线：**抓取单个网页 → Claude 结构化 → 写入 `content/daily` 或 `content/review` → 可选 `git push`。**

## 环境要求

- Python 3.11+（推荐 3.12）
- 仓库根目录已配置 `.env.local` 或环境变量

## 安装

```bash
cd openclaw
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 配置

1. **`sources.json`**  
   填入真实新闻**文章页** URL（不是首页）。可多条，默认用第 0 条。

2. **环境变量（可放在仓库根目录 `.env.local`）**

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` 或 `CLAUDE_API_KEY` | Anthropic API Key（必填） |
| `ANTHROPIC_MODEL` | 可选，默认 `claude-3-5-sonnet-20241022` |
| `CONFIDENCE_NEED_REVIEW` | 可选，默认 `0.7`；低于此写入 `content/review` |
| `GITHUB_TOKEN` | Personal Access Token，`repo` 权限（仅 `git push` 时需要） |
| `GITHUB_OWNER` / `GITHUB_REPO` | 仓库 `owner/name` |
| `GITHUB_BRANCH` | 可选，默认 `main` |

## 运行

在**仓库根目录**或 `openclaw` 下均可（脚本内已定位 `REPO_ROOT`）：

```bash
# 只抓取，不调模型（调试网络）
python openclaw/run_once.py --dry-run

# 生成 MDX，不推送
python openclaw/run_once.py --no-push

# 生成并 push（需配置 GitHub 变量）
python openclaw/run_once.py
```

指定 `sources.json` 第 N 条：

```bash
python openclaw/run_once.py --source-index 1 --no-push
```

生成后建议在根目录执行：

```bash
npm run content:validate
```

## 与站内 Schema 对齐

输出 frontmatter 需通过 `npm run content:validate`（与 `lib/schema.ts` 一致）。若 Claude 返回字段缺失，脚本会 `json.loads` 失败或校验失败，请调 prompt 或升级模型。

## 说明

- 抓取为轻量 HTML 解析，复杂站点可能需要你们换专用解析或 RSS。
- **请勿**对未授权站点高频抓取；遵守 robots 与对方条款。
