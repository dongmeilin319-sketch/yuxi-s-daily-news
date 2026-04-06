# 周报正文结构（简洁版）

与 `content/weekly/*.mdx` 兼容：frontmatter 保持 `title`、`slug`、`date`、`summary`、`weekLabel`、可选 `activeCompanies`；正文用 Markdown 标题组织。

## 建议小节（复制到 MDX 正文即可）

1. **本周要点（3–5 条）**  
   从本周高 `confidence` 或重点 `track` 的新闻中提炼 bullet，面向商业化/产品读者。

2. **客户与采购相关**  
   招标、框架合同、合规/下架对 **企业采购与预算** 的影响（每条 1–2 句即可）。

3. **对话 / 语音 / 联络中心**  
   与智能客服、外呼、语音相关的条目归纳；附录可用 `npm run weekly:digest` 拉取候选链接列表。

4. **下周值得关注**  
   1–3 条待观察问题或预测（人工一句话级）。

## `activeCompanies`

可在 frontmatter 手写，或用 `weekly:digest` 输出的 YAML 草稿（按本周新闻 `labels` 中 `type: 公司` 频次排序）。
