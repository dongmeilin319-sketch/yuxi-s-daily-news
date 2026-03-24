# 环境准备与部署前置（macOS）

本项目后续会覆盖“抓取 -> AI 处理 -> Git 提交 -> Vercel 部署 -> 前端展示”的全流程。
为避免本机环境缺失导致中断，请先完成以下准备。

## 1. 一键安装基础工具

在项目根目录执行：

```bash
chmod +x scripts/bootstrap_macos.sh scripts/preflight_check.sh
./scripts/bootstrap_macos.sh
```

该脚本会安装：
- Xcode Command Line Tools
- Homebrew
- Node.js / pnpm
- Python
- GitHub CLI (`gh`)
- Vercel CLI (`vercel`)
- `jq`
- Docker Desktop（可选但建议安装）

## 2. 登录云端服务

```bash
gh auth login
vercel login
```

## 3. 配置环境变量

```bash
cp .env.example .env.local
```

然后编辑 `.env.local` 填写真实密钥与仓库信息。

## 4. 执行预检

```bash
./scripts/preflight_check.sh
```

通过标准：
- 工具均已安装
- `gh`、`vercel` 已登录
- `.env.local` 已存在

## 5. 首次项目初始化（后续开发阶段会执行）

```bash
pnpm create next-app@latest .
pnpm add @next/mdx @mdx-js/loader @mdx-js/react gray-matter reading-time remark-gfm rehype-slug
```

## 6. 部署准备清单（Vercel）

完整步骤（含自定义域名、`NEXT_PUBLIC_SITE_URL`）见项目内文档：

- `docs/DEPLOY_VERCEL.md`

摘要：

- GitHub 仓库已创建并关联，Vercel 已 Import 该项目
- **Production** 环境变量必须配置 `NEXT_PUBLIC_SITE_URL`（`https://` + 域名，无末尾 `/`），保存后需 **Redeploy**
- 自定义域名在 Vercel **Domains** 中绑定，DNS 生效后将 `NEXT_PUBLIC_SITE_URL` 改为正式域名并再次部署
- 生产分支固定为 `main`；预览可使用其他分支（建议 `develop`）
- 本地 `.env.local` 可与 Vercel 对齐开发；线上以 Vercel Dashboard 为准

## 7. 回滚与熔断准备

- 保持 `main` 为稳定版本
- 新功能默认走 `develop`
- 构建失败时回滚到上一个稳定 commit
- 抓取异常时启用手动内容模板保底更新

---

如果你希望，我下一步可以直接在当前目录继续完成：
1) Next.js 项目初始化  
2) MDX 渲染管线  
3) 首页+详情页最小可用版本  
4) Vercel 可部署骨架
