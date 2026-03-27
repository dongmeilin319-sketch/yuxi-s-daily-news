# 项目守则与版本记录（Dev）

## 1. 这段时间的开发过程（复盘）
本项目的核心链路是：**OpenClaw / Skills 生成 MDX → 前端读取与渲染 → 构建前内容校验 → 上线发布**。

在你的这轮需求里，主要经历了三类“跨层联动”改动：

1. **字段契约联动（Frontmatter 改动）**
   - 新增新闻字段：`originalUrl`（原文链接）。
   - 同步更新：
     - `lib/schema.ts`（Zod schema）
     - `scripts/validate-content.mjs`（独立的 Zod 校验逻辑）
     - 生成端：`skills/news-git-mdx-push/ingest_day.py`（required 字段 + prompt 输出 + 写入 frontmatter）
     - 展示端：详情页增加“查看原文”入口，且确保其他页面能正确容忍/渲染新字段。

2. **内容质量联动（去重）**
   - 在生成端实现全自动的 **7 天全局去重**（纯本地计算）：
     - URL 规范化（含 `canonical`）
     - 标题相似度阈值
     - 时间窗口（限定在过去 7 天内）
   - 去重发生在 LLM 之前，降低重复生成成本。

3. **内容清空联动（保持页面结构）**
   - 为实现“清空线上新闻但保留站点功能”，使用 `git mv` 将 MDX 从活跃目录移到 `content/removed/`。
   - 纠正误解后：**周报 `content/weekly` 被保留**，避免 `/weekly` 页面出现空数据/异常。

4. **采集时间与筛选联动（内容可运营）**
   - 新增字段：`collectedAt`（采集入库时间），并完成全链路同步：
     - `lib/schema.ts`、`scripts/validate-content.mjs`
     - 生成端：`skills/news-git-mdx-push/ingest_day.py`、`openclaw/run_once.py`
     - 展示端：首页列表/详情页展示采集时间，首页新增“采集时间/公司”筛选，今日新增显示 `NEW`。
   - 历史 `content/daily/*.mdx` 已批量补齐 `collectedAt`（先与 `publishAt` 对齐，保证契约完整）。

此外，这里还涉及“线上运行时兼容性”与“归档策略”修复：
- 当内容目录缺失/不可读时，前端内容读取不应在运行时尝试创建目录或写磁盘（Vercel 运行时更严格）。
- 与 `node:fs` 相关的路由需要确保使用 Node 运行时（避免被误判为 Edge 导致 500）。
- 归档脚本增加保护：`content/daily` 最少保留 7 天，避免新生成内容被过早迁移到 `content/archive` 导致首页不展示。

---
## 2. 重点机制（你后续最常用的知识点）

### 2.1 内容契约：MDX `frontmatter` 是唯一数据源
所有前端展示与校验都围绕 `content/*/*.mdx` 的 `frontmatter` 展开。
`npm run content:validate` 会在构建前强制校验（否则会失败）。

字段增删改必须遵守：`docs/CONTENT_FIELD_CONTRACT_SYNC.md`（已作为项目守则落地）。

### 2.2 生成端是“可被验证”的：写对 frontmatter 就能上线
生成端不是“写了就行”，而是：
- 必须输出满足 schema 的字段结构；
- 校验脚本必须通过；
- UI 端要能容忍缺失/可选字段（如 `originalUrl`）。

### 2.3 “清空内容”不是删除页面：而是移走 MDX
站点路由仍在，但列表数据来自 MDX 目录。
因此“清空新闻”应当是移动/清空 `content/daily|review|archive`（或按需求做子集），而不是删除路由文件。

### 2.4 运行时容错：目录不存在视为空，而不是报错
在 Vercel 等 serverless 环境里：
- 不要在运行时创建目录/写文件；
- 文件读取失败要降级为空集合；
- 与 `node:fs` 有关的路由尽量保证 node 运行时。

---
## 3. 开发守则（Checklist）

### 3.1 当你要改/增 `frontmatter` 字段
必须完成下面三件事（详见 `docs/CONTENT_FIELD_CONTRACT_SYNC.md`）：
- schema：`lib/schema.ts` + `scripts/validate-content.mjs`
- 展示端引用：相关页面/组件/统计逻辑（至少首页/详情页/标签/聚合统计等）
- 生成端输出：仍在使用的生成脚本（例如 `skills/news-git-mdx-push/ingest_day.py` 以及可能的 `openclaw/run_once.py`）
- 验证：`npm run content:validate` → `npm run build` → 抽查至少 1 条生成 MDX

### 3.2 当你要处理“空内容/目录缺失”
必须保证：
- `getAllNews/getAllReviewNews/getAllArchiveNews/getAllWeekly` 在目录不存在/不可读时返回 `[]`；
- 不能在运行时对磁盘做 `mkdirSync` / 写入（Vercel 运行时风险更高）；
- 读取异常应当被 try/catch 捕获并降级。

### 3.3 当你要改动对外接口（sitemap/rss/OG 等）
必须保证：
- sitemap/rss 涉及 `node:fs` 时，要强制或确认它使用 Node 运行时；
- 验证顺序：`/`、`/weekly`、`/sitemap.xml`、`/rss.xml`、至少抽查 1 条 `/news/<slug>`。

### 3.4 当你要改动归档策略
必须保证：
- 不得把“近 7 天”新闻从 `content/daily` 提前迁移；
- 若调整 `ARCHIVE_DAYS`，应明确其与“首页曝光周期/去重窗口”一致；
- 修改后执行一次 `archive:run` 本地验证，确认不会误迁移当天/昨天内容。

---
## 4. 当前状态（线上）

- 首页 `/` 与周报 `/weekly` 正常。
- `sitemap.xml` / `rss.xml` 已做运行时容错与懒加载处理，保障可用性。
- OpenClaw 生成后，只要成功 push 到 `main`，可正常发布到网站。

---
## 5. 版本记录（main 分支最近关键提交）

> 说明：这里以 `git log` 的提交信息为“版本线索”，便于你后续快速定位行为变化。

- `3fe3b11` `feat: add collectedAt field with new badges and filters`
  - 新增 `collectedAt` 字段全链路联动；首页增加 NEW 标识与“采集时间/公司”筛选；历史 daily 批量补齐采集时间。
- `0158c05` `fix: keep at least 7 days of daily content before archiving`
  - 归档脚本新增保护阈值，避免新生成新闻被过早迁移导致首页不展示。
- `e61d7c9` `fix: force node runtime for rss/sitemap`
  - 强制 RSS / sitemap 走 Node 运行时（避免 Edge 误判导致 `node:fs` 不可用）。
- `c44bbef` `fix: make content fs reads resilient in runtime`
  - `lib/content.ts` 读取目录/文件失败时降级为空，避免运行时崩溃。
- `a9d4454` `fix: avoid runtime dir creation when content directories missing`
  - 避免运行时对内容目录进行创建；目录缺失视为空。
- `0c2c2ea` `fix: restore weekly content while clearing news`
  - 清空 daily/review/archive 的同时保留周报，以确保 `/weekly` 正常。
- `fc5bf00` `chore: remove all content from site`
  - 将活跃内容 MDX 从站点目录迁出，达成“清空新闻”的目标（当时一度把周报也迁走，后续再修复）。
- `943eba7` `fix: dedup daily news in last 7 days`
  - 生成端新增跨批次 7 天全局去重逻辑（URL/标题相似度/时间窗口）。
- `5564863` `feat: add original source links and optimize homepage filtering UX`
  - 新增 `originalUrl` 字段 + 详情页“查看原文”入口；同时优化首页筛选/看板 UI，并移除邮件订阅模块。

