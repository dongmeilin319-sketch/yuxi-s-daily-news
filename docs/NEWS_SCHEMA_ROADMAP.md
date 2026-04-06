# 新闻字段演进（跑通后的可选项）

当前 **MVP：不新增必填 frontmatter**，先按 [NEWS_INGEST_SCOPE.md](./NEWS_INGEST_SCOPE.md) 收紧采集与 `track`/`labels` 约定，观察 1–2 周列表与周报是否够用。

## 若仍不够用时再考虑（均为可选字段）

| 字段（示例） | 用途 | 赋值方式（优先低成本） |
|--------------|------|-------------------------|
| `commercialSignal` | `high` / `med` / `low` 商机信号 | **规则引擎**：监管重罚、头部客户签约、明码调价、区域招标等关键词 + track 组合 |
| `solutionArea` | `客服` / `外呼` / `通用` | 关键词或 `labels` 中 `type: 场景` 映射，避免重复人工 |

任何新增字段必须同步：`lib/schema.ts`、`scripts/validate-content.mjs`、生成端与展示端（见 [CONTENT_FIELD_CONTRACT_SYNC.md](./CONTENT_FIELD_CONTRACT_SYNC.md)）。
