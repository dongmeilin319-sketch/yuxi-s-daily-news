# OpenClaw 官方形态 + 与本站内容管线对接

本文结合 **[OpenClaw 官方文档](https://docs.openclaw.ai/)** 与 **[openclaw/openclaw 仓库 `skills/`](https://github.com/openclaw/openclaw/tree/main/skills)**，说明：**你需要我（本仓库）输出什么**、以及 **你在 OpenClaw 里要如何配置** 才能完成「每日新闻 → MDX → GitHub → Vercel 站」。

---

## 0. 官方 OpenClaw 是什么（你需要先建立的心智模型）

根据 [OpenClaw 概述](https://docs.openclaw.ai/)：

- **OpenClaw 是自托管 Gateway**：把 Telegram / WhatsApp / Discord / iMessage 等**频道**接到 **AI Agent（如 Pi）**，在你自己的机器或服务器上跑。
- **配置**默认在 `~/.openclaw/openclaw.json`。
- **定时任务**由 Gateway 内置 **[Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs.md)** 管理（`openclaw cron add …`），可触发 **systemEvent** 或 **isolated agent turn**（对 Agent 发一条「要做什么事」的指令）。
- **Skills** 是可安装的能力包（[Skills CLI](https://docs.openclaw.ai/cli/skills.md)：`openclaw skills install …`），装在当前 **workspace** 的 `skills/` 目录。

**重要：** 本站 Next.js **不提供**「OpenClaw 上传接口」。内容进站的唯一契约仍是：**Git 仓库里出现合法 `.mdx`** → push → Vercel 构建。

---

## 0.5 Gateway 在另一台电脑时：仓库放哪里、怎么「设路径」？

OpenClaw Gateway 跑在电脑 A，你开发可能在电脑 B，这很正常。**流水线只需要在电脑 A 上有一份与 GitHub 同步的「整站仓库」克隆**，路径由你自定，但要满足下面规则。

### 建议目录（不要和 OpenClaw 配置搅在一起）

| 系统 | 推荐路径示例 | 说明 |
|------|----------------|------|
| macOS | `/Users/你的用户名/Projects/ai-intelligence-hub` | 用户目录下单独文件夹，**不要**放在 `~/.openclaw/` 里 |
| Linux / VPS | `/home/你的用户名/projects/ai-intelligence-hub` | 同上，便于备份与权限管理 |

原则：**这是你的 Next + MDX 站点同一个 Git 仓库**，只是多了一台机器上的工作副本；与 `~/.openclaw/openclaw.json`（Gateway 配置）分开存放，避免混在 OpenClaw 内部目录里。

### 克隆后目录长什么样（必须这样，`run_once.py` 才找对根目录）

`openclaw/run_once.py` 会把「仓库根」算成 `openclaw` 文件夹的**上一级**，因此克隆后应是：

```text
ai-intelligence-hub/          ← 这就是「仓库根」REPO_ROOT（你要记在心里的路径）
├── app/
├── content/
├── openclaw/
│   ├── run_once.py
│   ├── sources.json
│   └── requirements.txt
├── package.json
└── …
```

### 在 Gateway 电脑上第一次设置（命令示例）

把下面里的 URL、用户名换成你自己的：

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/<你的用户名>/<仓库名>.git ai-intelligence-hub
cd ai-intelligence-hub
```

配置密钥（在**这一台电脑**上）：

```bash
# 任选：把本仓库 .env.example 抄成 .env.local 再填 KEY
cp .env.example .env.local
# 编辑 .env.local：ANTHROPIC_API_KEY 或 CLAUDE_API_KEY、GITHUB_TOKEN、GITHUB_OWNER、GITHUB_REPO 等
```

Python 流水线：

```bash
cd ~/Projects/ai-intelligence-hub/openclaw
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

编辑 `openclaw/sources.json` 里的文章 URL。

手跑一条（不写远程前先加 `--no-push`）：

```bash
cd ~/Projects/ai-intelligence-hub
source openclaw/.venv/bin/activate
python openclaw/run_once.py --no-push
```

### 「路径」在 OpenClaw 里要设在哪裡？

OpenClaw 没有全局「新闻仓库路径」一项配置；你要在**触发执行的地方**写**绝对路径**：

1. **Cron / 定时任务里的指令**（[Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs.md)）  
   消息或脚本里写死，例如：  
   `cd /Users/你的用户名/Projects/ai-intelligence-hub && git pull && source openclaw/.venv/bin/activate && python openclaw/run_once.py`

2. **coding-agent / bash 的 `workdir`**  
   填：**仓库根**的绝对路径，例如：  
   `workdir:/Users/你的用户名/Projects/ai-intelligence-hub`

3. **系统 crontab / systemd（不用 OpenClaw Cron 时）**  
   同样在 shell 里先 `cd` 到上述仓库根再执行命令。

**务必用绝对路径**（`/Users/...` 或 `/home/...`），避免 Gateway 工作目录变化导致 `cd` 错地方。

### Git 身份与推送

- 若用 **HTTPS + Token**：`run_once.py` 内已支持用 `GITHUB_TOKEN` 做一次 push URL（见脚本内 `git push` 逻辑）；需在 Gateway 机上填好 `.env.local`。
- 若用 **SSH 密钥**：在该机上 `ssh-keygen`，把公钥加到 GitHub，克隆用 `git@github.com:...`，且保证 `git push` 在无交互下成功（可先在终端手动 `git push` 试一次）。

---

## 1. 官方 `skills/` 里，哪些和「新闻 → GitHub」直接相关？

| Skill | 能做什么 | 对本模块的意义 |
|--------|----------|----------------|
| [**blogwatcher**](https://github.com/openclaw/openclaw/tree/main/skills/blogwatcher) | 用 `blogwatcher` CLI 监控 **RSS/Atom**、扫描新文章 | **适合做信源发现**（先 `blogwatcher add` / `scan`，再交给 Agent 或脚本处理 URL） |
| [**github**](https://github.com/openclaw/openclaw/tree/main/skills/github) | 用 **`gh` CLI** 做 issue / PR / CI 查询等 | **明确写了**：本地 **commit / push / pull** → **不要用本 skill，用 `git` 直接做** | 
| [**coding-agent**](https://github.com/openclaw/openclaw/tree/main/skills/coding-agent) | 在指定 **`workdir`** 里跑 Claude Code / Codex 等改代码、可完成提交 | 适合「复杂多步」时在**你的新闻仓库目录**里让 Agent 写 MDX 并 `git push` |
| [**summarize**](https://github.com/openclaw/openclaw/tree/main/skills/summarize) | 摘要类能力 | 可作为日报正文压缩步骤（视你安装的版本而定） |
| [**skill-creator**](https://github.com/openclaw/openclaw/tree/main/skills/skill-creator) | 创作新 skill | 若你要固定「日报 MDX 模板 + 校验」可做成**自定义 skill** |

结论：**没有把 MDX 自动推到 GitHub 的单一专用 skill**；实际落地是 **`blogwatcher`（可选）+ 你的日报逻辑 + `git`/`python`/`coding-agent` 在仓库路径里执行**。

---

## 2. 本仓库需要「输出」什么给你（交付清单）

这些内容已在本仓库中，可直接给负责 OpenClaw 的同事使用：

| 交付物 | 路径 | 用途 |
|--------|------|------|
| **MDX + frontmatter 契约** | 本文 §3、`lib/schema.ts` | SKILL / Agent 生成内容必须满足，否则 `npm run content:validate` 失败 |
| **参考流水线（Python）** | `openclaw/run_once.py`、`openclaw/sources.json`、`openclaw/README.md` | 可在 Gateway 主机上用 **一条命令** 完成：抓 URL → Claude → 写 `content/daily` 或 `review` → `git push` |
| **环境变量约定** | `docs/ENVIRONMENT.md`、`.env.example` | `ANTHROPIC_*`、`GITHUB_*`、`CONFIDENCE_NEED_REVIEW` 等与脚本一致 |

你无需再向本站申请 API Key（除你自己部署的站外）；**需要的是 Anthropic 与 GitHub Token 跑在 OpenClaw Gateway 所在环境**。

---

## 3. MDX 落盘契约（与官方文档无关，与本站强相关）

与历史版本相同，请参考下面路径与示例（完整字段见 `lib/schema.ts`）。

### 3.1 路径

| 场景 | 路径 |
|------|------|
| 正常发布 | `content/daily/*.mdx` |
| 低置信 | `content/review/*.mdx` |
| 周报 | `content/weekly/*.mdx`（frontmatter 不同） |

### 3.2 日报示例结构

```mdx
---
title: "中文标题"
slug: "english-slug-only"
date: "2026-03-26T08:00:00.000Z"
publishAt: "2026-03-26T08:00:00.000Z"
summary: "一句话摘要"
sources:
  - "信源显示名"
track: "赛道名"
impactType: "影响类型"
sentiment: "neutral"
confidence: 0.82
labels:
  - type: "公司"
    value: "示例公司"
  - type: "任务"
    value: "示例任务"
relatedArticles: []
---

<AIAbstract>…</AIAbstract>

## 洞察

<Insight title="短期">…</Insight>
<Insight title="中期">…</Insight>
<Insight title="风险">…</Insight>
```

合并前在仓库根：`npm run content:validate`。

---

## 4. 你在 OpenClaw 里推荐怎么配置？（三种难度）

### 方式 A — 最少自定义：Cron + Shell 跑本仓库脚本（推荐先做）

适合：**Gateway 跑在一台长期在线机子上**，且你已 `git clone` 本仓库到固定路径（例如 `~/projects/news`）。

1. **安装 OpenClaw**：[Getting Started](https://docs.openclaw.ai/start/getting-started) — `npm i -g openclaw@latest`，`openclaw onboard`。
2. **在该机上**：clone 本仓库，`cd openclaw && python3 -m venv .venv && pip install -r requirements.txt`，配置 `.env.local`（或导出环境变量）含 `ANTHROPIC_API_KEY`、`GITHUB_TOKEN`、`GITHUB_OWNER`、`GITHUB_REPO`。
3. **编辑** `openclaw/sources.json` 为真实文章 URL。
4. 用 **[Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs.md)** 每天触发一次 **isolated agent**，消息内容等价于：

   > 在 `workdir:~/projects/news` 执行：`git pull && . openclaw/.venv/bin/activate && python openclaw/run_once.py`，若失败把日志摘要发给我。

   或不用 Agent，直接在主机系统 **cron / systemd timer** 跑同一条 shell（OpenClaw 只负责通知可选）。

5. **不要**依赖官方 `github` skill 做 push；push 由脚本内 `git` 或你手工配置的 credential 完成。

### 方式 B：博客 RSS + Agent 编排

1. `openclaw skills install blogwatcher`（若使用 [skills CLI](https://docs.openclaw.ai/cli/skills.md) / ClawHub）。
2. 配置 `blogwatcher` 跟踪信源 RSS（见 [blogwatcher SKILL](https://github.com/openclaw/openclaw/tree/main/skills/blogwatcher)）。
3. 定时（OpenClaw **cron** 或 **Standing Orders**）让 Agent：  
   `blogwatcher scan` → 取最新文章 URL → 调用与本站一致的模板生成 MDX（可让 Agent 读 `docs/OPENCLAW_INTEGRATION.md` §3）→ 在 **新闻仓库 clone 路径** `git add/commit/push`。

### 方式 C：大改时用 `coding-agent`

对「多文件、多轮修改」：用 [coding-agent](https://github.com/openclaw/openclaw/tree/main/skills/coding-agent) 的 **`workdir` 指向新闻仓库**，prompt 中明确：只改 `content/daily`、遵守 `lib/schema.ts`、完成后 `npm run content:validate` 再通过再 push。

---

## 5. OpenClaw 侧配置检查清单（可复制）

- [ ] Gateway 已安装并可常驻（[文档](https://docs.openclaw.ai/) Quick start）。
- [ ] `~/.openclaw/openclaw.json` 中模型 / 频道按需配置。
- [ ] 本新闻仓库已 clone 到 Gateway 可访问路径，且 `main` 可 push。
- [ ] 已安装 **`blogwatcher`（若走 RSS）**、`gh`（若要用 **github** skill 查 CI，与 push 无关）、Python 依赖（`openclaw/requirements.txt`）。
- [ ] 环境变量：`ANTHROPIC_API_KEY` 或 `CLAUDE_API_KEY`，以及 `GITHUB_TOKEN`（repo）、`GITHUB_OWNER`、`GITHUB_REPO`。
- [ ] 已添加 **Cron**（[`openclaw cron add`](https://docs.openclaw.ai/automation/cron-jobs.md)）或主机 crontab，时区与「日报时间」一致。
- [ ] 首次跑通后：GitHub 上出现新 commit，Vercel 部署成功，`/news/<slug>` 可访问。

---

## 6. 常见误解澄清

| 误解 | 实际 |
|------|------|
| 官方 **github** skill 会帮我 push MDX | 不会；它管 **gh API**，本地提交应用 **`git`**（见 [github/SKILL.md](https://github.com/openclaw/openclaw/blob/main/skills/github/SKILL.md)） |
| OpenClaw 会通过 HTTP 把内容 POST 到我的 Next 站 | 不会；本站读 **Git 文件** |
| 必须用「日报生成 SKILL」这个名字 | 无强制；可以用 **cron 消息 + `run_once.py`** 或 **自定义 skill** |

---

## 7. 与本仓库 `openclaw/run_once.py` 的关系

`run_once.py` 是**可独立运行**的最小参考实现；与 OpenClaw Gateway **无协议耦合**。你只要让 OpenClaw 在定时任务里 **等价于执行该命令**（或在 Agent 的 `workdir` 里执行），即完成与本模块的集成。

---

## 8. 验收标准

- [ ] GitHub `content/daily/` 或 `content/review/` 出现新 `.mdx`。
- [ ] `npm run content:validate` 通过。
- [ ] 生产站 `/news/<slug>` 可访问。

---

## 参考链接

- [OpenClaw 文档首页](https://docs.openclaw.ai/)
- [Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs.md)
- [Skills CLI](https://docs.openclaw.ai/cli/skills.md)
- [openclaw/openclaw `skills/` 目录](https://github.com/openclaw/openclaw/tree/main/skills)
