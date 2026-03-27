# Dlim's Wonderland

AI 行业新闻聚合与结构化洞察网站（Phase 1 开发中）。

## 本地开发

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 内容目录

- `content/daily/*.mdx`：日报内容
- `content/weekly/*.mdx`：周报内容

## 内容校验

构建前会自动执行 frontmatter 校验：

```bash
npm run content:validate
```

可手动生成首页统计数据：

```bash
npm run stats:generate
```

可执行归档脚本（把超过 30 天的 daily 内容移动到 archive）：

```bash
npm run archive:run
```

校验项包含：
- 必填字段
- 字段类型
- 时间格式
- `confidence` 范围（0~1）
- slug 唯一性（目录内）

## 路由

- `/`：新闻列表
- `/news/[slug]`：新闻详情
- `/weekly`：周报列表
- `/weekly/[slug]`：周报详情
- `/search`：站内搜索（MVP）
- `/admin`：管理后台占位页（即将上线）
- `/api/cron/daily`：定时任务占位接口
- `/archive`：历史归档列表
- `/sitemap.xml`：站点地图
- `/robots.txt`：爬虫规则
- `/rss.xml`：RSS 订阅
- `/manifest.webmanifest`：PWA 清单
- `/api/subscribe`：邮件订阅（占位，可配 `SUBSCRIBE_WEBHOOK_URL`）

全局顶栏含浅色/深色主题切换；新闻详情页提供「复制分享文案」按钮。

## OpenClaw（Python 最小流水线）

抓取 → Claude → MDX → 可选 Git 推送：`openclaw/run_once.py`，说明见 [openclaw/README.md](./openclaw/README.md)。

若使用**独立 OpenClaw 产品与日报 SKILL**，与本站之间的**落盘路径、MDX 格式、Git 推送**约定见 [docs/OPENCLAW_INTEGRATION.md](./docs/OPENCLAW_INTEGRATION.md)。

开发规范：任何对 MDX `frontmatter` 字段的增删改，都必须遵守“同步改动清单”，见 [docs/CONTENT_FIELD_CONTRACT_SYNC.md](./docs/CONTENT_FIELD_CONTRACT_SYNC.md)。

开发守则与版本线索见 [docs/PROJECT_GOVERNANCE.md](./docs/PROJECT_GOVERNANCE.md)。

## 环境变量

完整列表：[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)。

## 部署

**生产环境（GitHub + Vercel + 自定义域名 + `NEXT_PUBLIC_SITE_URL`）** 请看分步说明：

- [Vercel 生产部署与域名配置](./docs/DEPLOY_VERCEL.md)

要点：

1. 仓库推送到 GitHub，在 Vercel Import 项目。
2. 在 Vercel **Environment Variables** 为 **Production** 设置 `NEXT_PUBLIC_SITE_URL=https://你的域名`（无尾斜杠），保存后 **Redeploy**。
3. Vercel **Domains** 绑定域名并完成 DNS；再把 `NEXT_PUBLIC_SITE_URL` 改为该自定义域名并再次部署。

本地 CLI 手动部署（可选）：

```bash
chmod +x scripts/deploy_manual.sh
./scripts/deploy_manual.sh
```

该脚本会执行：内容校验 → 构建检查 → `vercel deploy --prod`。
# yuxi-s-daily-news
