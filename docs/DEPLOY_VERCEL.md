# Vercel 生产部署、域名与 NEXT_PUBLIC_SITE_URL

按顺序完成即可；域名字段以你在 DNS/注册商处的实际记录为准。

## 1. 代码进入 GitHub

1. 在 GitHub 新建空仓库（建议 `main` 为默认分支）。
2. 本地项目根目录执行（将下面的 URL 换成你的仓库地址）：

```bash
git init
git add .
git commit -m "chore: initial AI Intelligence Hub"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

若仓库已存在，只需 `git remote add` / `git push` 即可。

## 2. 在 Vercel 接入项目

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**。
2. **Import** 你的 GitHub 仓库。
3. **Framework Preset** 应自动识别为 Next.js，**Root Directory** 留空（仓库根目录即项目根）。
4. 先点击 **Deploy** 完成首次构建（使用默认环境变量即可）。

首次成功部署后你会得到形如 `https://<项目名>.vercel.app` 的地址。

## 3. 生产环境变量（必配）

在 Vercel：项目 → **Settings** → **Environment Variables**。

### 强烈建议（canonical 站点地址）

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://你的自定义域名` 或暂时 `https://<项目名>.vercel.app` | **Production**（Preview 可选同样填，便于预览环境 SEO 一致） |

要求：

- 必须包含协议：`https://`
- **不要**末尾斜杠，例如正确：`https://news.example.com`，错误：`https://news.example.com/`

作用：`metadataBase`、Open Graph、`sitemap.xml`、`rss.xml`、分享文案里的链接、部分绝对 URL 都依赖该值。

### 站点功能相关（按需）

| Name | 说明 |
|------|------|
| `ADMIN_PASSWORD` | `/admin` 登录密码；不设则无法按设计使用后台 |
| `SUBSCRIBE_WEBHOOK_URL` | 邮件订阅转发 Webhook，不设则为占位成功 |
| `ARCHIVE_DAYS` | 可选，归档脚本默认 `30` |

保存成功之后：**Deployments** → 对最新 Production 部署点 **Redeploy**（或推一个新 commit），以便带新变量重新构建。

> 说明：即使未配置 `NEXT_PUBLIC_SITE_URL`，项目在 Vercel 上运行时也会使用自动注入的 `VERCEL_URL`（`https://xxx.vercel.app`）作为回退，但**绑定自定义域名后仍应把 `NEXT_PUBLIC_SITE_URL` 改成官网域名**，避免 sitemap/OG 与对外品牌不一致。

## 4. 绑定自定义域名

1. Vercel：项目 → **Settings** → **Domains** → 添加域名，例如 `news.example.com` 或 `www.news.example.com`。
2. 按 Vercel 提示在 DNS 添加记录，常见两类：

**子域名（推荐）** `news.example.com`

- 类型：**CNAME**
- 名称：`news`（或主机记录按注册商说明填写）
- 目标：Vercel 提供的值（一般为 `cname.vercel-dns.com`）

**根域名** `example.com`

- 部分注册商用 **A** 记录指向 Vercel 提供的 IP列表，或使用 Vercel 要求的方式；以 Dashboard 当期说明为准。

3. 等待 SSL **Valid**，访问 `https://你的域名` 确认站点打开。

4. 将 **Environment Variables** 里的 `NEXT_PUBLIC_SITE_URL` 更新为 `https://你的自定义域名`，并对 Production **重新部署**。

## 5. 生产分支与预览

- **Production Branch**：Settings → **Git** → 将生产分支设为 `main`（或你的主分支）。
- 其他分支推送会生成 **Preview URL**，若希望预览环境 RSS/OG 也正确，可为 **Preview** 单独设 `NEXT_PUBLIC_SITE_URL` 为该次预览的 Vercel 域名（可选）。

## 6. Cron 与安全

`vercel.json` 中配置了每日调用 `/api/cron/daily`。

1. 在 Vercel **Environment Variables** 为 Production（及需用 Cron 的环境）添加 **`CRON_SECRET`**（随机长串）。保存后 **Redeploy**。设了该变量后，Vercel Cron 发起请求时会自动附带 `Authorization: Bearer <CRON_SECRET>`，接口才会返回 200；未配置时接口在开发/调试下仍开放（生产务必配置）。
2. 当前该路由仅作**存活探针**与后续扩展钩子；**正文抓取与写 MDX** 由本地或 **GitHub Actions** 运行 `openclaw/run_once.py`（见 `openclaw/README.md`），或另行接入。
3. Vercel **Cron** 能力依赖套餐与官方说明；若不可用，可用外部调度 `curl -H "Authorization: Bearer $CRON_SECRET" https://你的域名/api/cron/daily`。

环境变量总表见 [ENVIRONMENT.md](./ENVIRONMENT.md)。

## 7. 交付检查清单

- [ ] Production 部署成功，浏览器可打开。
- [ ] `NEXT_PUBLIC_SITE_URL` 为最终 `https://` 域名（或明确的 `vercel.app` URL）且已 **Redeploy**。
- [ ] 访问 `https://你的域名/sitemap.xml`、`/robots.txt`、`/rss.xml` 内容中的链接为期望域名。
- [ ] 任意一篇 `/news/某slug`，用社交媒体调试工具抽查 OG 图与 URL。
- [ ] （可选）已设置 `ADMIN_PASSWORD` 并能登录 `/admin`。

## 8. CLI 部署（可选）

本地已登录 `vercel` 时：

```bash
vercel link
vercel env pull .env.local   # 可选：拉取远端环境变量到本地
vercel --prod
```

生产环境仍以 Dashboard 里配置的 **Environment Variables** 为准。
