# 内容字段契约同步规范（Dev）

本项目的页面展示与内容生产通过 **MDX 文件（`content/*/*.mdx`）的 `frontmatter`** 进行对接。

任何对 `frontmatter` 字段的 **增删改**，都必须同时满足三件事：

1. 生成端（OpenClaw / Skills）能写出新字段，或按新字段结构输出；
2. 站点构建前的内容校验能通过（否则 `npm run content:validate`/`prebuild` 会失败）；
3. 前端展示端能读取并正确渲染（否则 UI 不显示或类型/逻辑报错）。

因此，这不是“只改一个文件就行”的改动，而是跨“校验 + 展示 + 生成”的同步改动。

---

## 触发条件

当你要改/增 `frontmatter` 字段时，触发此规范。典型场景：

- 新增字段（例如 `coverImage`、`author`、`tags` 等）
- 修改字段类型/取值范围（例如 `sentiment` 枚举新增项、`confidence` 范围约束变化）
- 修改字段名（例如 `publishAt` 改为 `publishedAt`）
- 调整周报字段（`content/weekly/*.mdx`）

---

## 必须同步改动清单

按以下顺序检查并更新，否则很容易出现“生成端写了，但校验不过/页面不展示”的问题。

### 1) 站点契约（Schema）

- `lib/schema.ts`
- `scripts/validate-content.mjs`
  - 注意：该校验脚本内部存在一份“独立/重复”的 Zod schema 定义，字段改了也必须同步更新。

### 2) 展示端引用这些字段的页面/组件/统计逻辑

至少需要检查并同步更新所有直接使用这些字段的地方，例如：

- `app/page.tsx`（首页筛选、统计展示）
- `app/news/[slug]/page.tsx`（详情页展示、相关推荐逻辑）
- `components/news-labels.tsx`（标签渲染与筛选链接）
- `lib/stats.ts`（聚合统计）

此外，也建议全局排查其它引用 `item.<field>` 的页面，例如后台/归档/搜索页等（字段变更很容易漏掉非主链路页面）。

### 3) 生成端（MDX 写入 frontmatter）

如果你仍在使用以下生成流水线（其中一个或多个都可能存在），必须同步：

- `skills/news-git-mdx-push/ingest_day.py`
  - 重点关注：`REQUIRED_FRONTMATTER_FIELDS`、`build_prompt()`、`write_mdx()`
- 如果还在使用 `openclaw/run_once.py`
  - 重点关注：`write_mdx()` 以及 prompt 输出字段生成逻辑

---

## 验证步骤（强制建议）

字段改完后，建议按如下方式验证（尤其是在你改了校验 schema 或生成端后）：

1. `npm run content:validate`
2. `npm run build`（或至少触发一次 `prebuild` 相关流程）
3. 人工抽查一条生成后的 MDX：
   - 确认 frontmatter 是否包含新字段
   - 确认详情页/列表页是否正常展示

---

## 结论

把“字段增删改”当成一次 **内容契约变更** 来处理：同时更新 `lib/schema.ts`、`scripts/validate-content.mjs`、所有展示引用位置，以及所有仍在运行的生成端脚本。

