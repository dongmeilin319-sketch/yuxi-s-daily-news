---
name: news-git-mdx-push
description: "Fetch/generate latest news MDX, write to Git-tracked files, commit, and git push to trigger Vercel refresh."
metadata: {"openclaw":{"emoji":"🧾","requires":{"anyBins":["python3","git","bash"]}}}
---

# news-git-mdx-push

## 目标（这一步“需要输出给 git 的东西”）
本 Skill 的交付物是：在目标新闻仓库中生成/更新 **可触发 Next/Vercel 页面刷新的 Git 文件**，并把这些更改 `commit + push` 到 Vercel 监听的分支。

在本仓库的约定下，通常是以下路径之一：

1. 正常发布：`content/daily/*.mdx`
2. 低置信需复核：`content/review/*.mdx`

每个 MDX 必须包含符合站内契约的 frontmatter（字段完整性由你们的 `npm run content:validate` 校验）。

## 适用场景 / 非适用场景
✅ 适用：
- OpenClaw 需要“每日/定时”把抓取结果落到 Git（MDX 文件）并通过 `git push` 自动触发 Vercel 部署。

❌ 不适用：
- 不要在这里做复杂的网页交互/浏览器自动化；此 Skill 只负责“落盘 + git”这一环。
- 不要在本 Skill 内处理“生成内容的具体提示词细节”；生成由此目录的 `ingest_day.py` 负责。

本 Skill 的“新闻生产逻辑”由此目录里的 `ingest_day.py` 负责（包含 24h 过滤、多源去重、中立性约束、字段完整性与写入/推送）。

## 前置条件（强制）
1. 仓库中准备 Python 依赖（脚本会优先使用 `openclaw/.venv/bin/python`）：
   - `cd /Users/dongmeilin/Desktop/cursor/news/openclaw`
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. `.env.local`（放在仓库根目录）需要包含：
   - `ANTHROPIC_API_KEY` 或 `CLAUDE_API_KEY`
   - `GITHUB_TOKEN`、`GITHUB_OWNER`、`GITHUB_REPO`
   - 可选：`GITHUB_BRANCH`、`CONFIDENCE_NEED_REVIEW`

3. 如果你把 Skill 装在 `~/.openclaw/skills/...`（而不是新闻仓库内部），必须显式设置：
   - `TARGET_REPO_ROOT=/你的新闻仓库根目录`
   - 该目录必须包含 `openclaw/sources.json`、`content/daily/`、`content/review/`。

## 需要你配置/传入的参数（通用）

请确保你在执行环境里能拿到这些值（可用环境变量或在提示词里显式传入）：

- `SOURCE_INDEX`：从 `openclaw/sources.json` 选择第几个信源条目（可选；不填则处理全部）
- `NO_PUSH`：是否仅生成文件不 push（默认 `false`）
- `TARGET_BRANCH`：要推到的分支（默认 `main`；脚本会映射到 `GITHUB_BRANCH`）
- GitHub 推送环境变量（仅在未设置 `NO_PUSH` 时需要）：
  - `GITHUB_TOKEN`：`repo` 权限的 token
  - `GITHUB_OWNER` / `GITHUB_REPO`：目标仓库
- Anthropic/Claude 环境变量（用于生成 MDX 内容）：
  - `ANTHROPIC_API_KEY` 或 `CLAUDE_API_KEY`
  - `ANTHROPIC_MODEL`（可选）

可选：
- `RUN_VALIDATE`：生成后是否执行 `npm run content:validate`（默认 `false`，因为可能需要 node）
- `DRY_RUN`：仅抓取/过滤/去重，不调用大模型、不写文件（默认 `false`）
- `NEUTRALITY_CHECK`：启用中立性审查（失败会把内容路由到 `content/review`）（默认 `true`）

性能/策略可选（更偏工程参数）：
- `HOURS`：时效窗口小时数（默认 `24`）
- `MAX_ITEMS`：最多生成多少条唯一新闻（默认 `10`）
- `MAX_LINKS_PER_SOURCE`：每个 hub 页面最多抽取多少候选文章链接（默认由脚本控制）
- `DEDUP_TITLE_THRESHOLD`：多源去重标题相似度阈值（默认 `0.88`）
- `DEDUP_TIME_HOURS`：多源去重发布时间窗口小时数（默认 `6`）

## 通用执行流程（OpenClaw 执行者照这个做）

1. 直接执行本 Skill 的入口脚本：
   - `bash {baseDir}/run.sh`

## 测试通路（建议先 dry-run）
1. 发现 + 24h 过滤 + 去重（不调用大模型、不写文件）：
   - `SOURCE_INDEX=0 DRY_RUN=true NO_PUSH=true bash {baseDir}/run.sh`
2. 正式生成并写入 MDX（仍不 push；需要 Anthropic key）：
   - `NO_PUSH=true RUN_VALIDATE=true NEUTRALITY_CHECK=true bash {baseDir}/run.sh`
3. 最终启用 push（触发 Vercel 部署；需要 GitHub token）：
   - `RUN_VALIDATE=true NEUTRALITY_CHECK=true bash {baseDir}/run.sh`

2. 入口脚本默认做的事：
   - 从 `openclaw/sources.json` 读取“配置的网站/栏目页（hub/list）URL 列表”
   - 先进行发现(discovery)：从 hub/list 页面抽取文章链接
   - 对每个候选文章页抽取发布时间 `publishAt`，只保留最近 24 小时内的新闻
   - 做多源去重：对同一新闻（标题相似度 + 发布时间窗口）合并多个来源
   - 调用大模型生成结构化 JSON（字段必须齐全），写入 `content/daily` 或 `content/review`
   - 如启用 `NEUTRALITY_CHECK`：若审查未通过，自动路由到 `content/review`
   - 若 `NO_PUSH=false` 且你提供了 GitHub token：它会 `git commit + git push`
   - 若 `RUN_VALIDATE=true`：则额外执行 `npm run content:validate`

3. 完成后验收要点（非强制，但建议）
   - GitHub 上出现新 commit
   - Vercel Deployments 里出现新的构建记录
   - 访问新产生 slug 的页面能看到更新（必要时无缓存刷新）

## 验收标准（必须满足）
1. Git 仓库出现新的/更新的 `content/daily/*.mdx` 或 `content/review/*.mdx`
2. 内容通过 `npm run content:validate`
3. `git push` 成功，把 commit 推到了 Vercel 监听的分支（通常是 `main`）

## 与你提出的 6 条规范的对齐说明
1. 24h 内：脚本抽取网页发布时间并与 `now-24h` 比较，不在窗口内会跳过
2. 指定网站：只发现并处理 `openclaw/sources.json` 中配置 hub/list 页面同一站点(host)的文章页
3. 真实性校验：候选文章页必须来自上述 hub 的同一站点(host)，并且发布时间必须能抽取到；抽取不到则跳过
4. 多新闻源去重：同发布时间窗口内且标题相似度高的条目会合并为唯一条目
5. 字段完整性：生成并落盘前会对 JSON 顶层字段做校验/补全，最终 frontmatter 需通过站内 schema 校验
6. 中立准确：prompt 强制“只基于正文片段/不要情绪化/不足则降低 confidence”；并可选启用 `NEUTRALITY_CHECK` 做二次审查

