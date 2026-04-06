# 每日新闻：采集范围与字段约定（运营 / 生成端对齐）

面向角色：**AI 智能客服 / AI 外呼、产品运营、企业商业化**。目标是在**不增加必填字段、不依赖每条新闻调用大模型**的前提下，让入库内容更可扫、可筛、可写周报。

与站点契约同步时，除本说明外仍须遵守 [CONTENT_FIELD_CONTRACT_SYNC.md](./CONTENT_FIELD_CONTRACT_SYNC.md)。

---

## 1. 采集源方向（白名单思路）

优先覆盖与 **B2B 对话式 AI、联络中心、语音、客服 SaaS、外呼合规、云通信** 相关的渠道（具体 URL/RSS 由你在采集配置中维护）。示例类别：

- 国际：云厂商 AI 公告、联络中心/CPaaS 厂商博客、行业媒体「AI + customer experience」栏目。
- 国内：云通信、SaaS 客服、大模型应用层报道、监管与电信合规动态。

**不做**：为每条候选新闻调用 LLM 做「相关性打分」；若未来需要，仅对已进入候选池的少量条目做二次判断。

---

## 2. 题侧过滤（关键词 / 正则，零模型成本）

入库前可用标题 + `summary` 做轻量匹配（`includes` 或正则），命中任一则保留或打高优先级。建议词表（可按业务增删）：

**英文（示例）**  
`contact center`, `call center`, `voice agent`, `conversational ai`, `outbound`, `IVR`, `CCaaS`, `CPaaS`, `customer support`, `virtual agent`

**中文（示例）**  
`智能客服`, `外呼`, `联络中心`, `呼叫中心`, `语音`, `对话`, `质检`, `人机协作`, `企业客户`, `SaaS`, `合规`, `电信`

可与 **赛道白名单** 组合：仅当 `track` 属于约定列表之一时才入库（若生成端已写 `track`）。

---

## 3. `track` / `impactType` / `labels` 约定

当前 schema 见 [lib/schema.ts](../lib/schema.ts)。**MVP 不新增必填字段**，通过约定取值提升一致性。

### 3.1 `track`（建议优先使用、可扩展）

自由文本即可，但生成端宜从下列 **推荐值** 中选，便于 [每日新闻列表](../app/daily/page.tsx) 筛选：

| 推荐 track | 适用内容 |
|------------|-----------|
| `联络中心与语音` | 语音合成/识别、电话机器人、实时语音、CCaaS |
| `企业服务与SaaS` | 客服工单、CRM、企业级应用上架/定价 |
| `对话式AI` | 多轮对话、Agent、工具调用与客服场景结合 |
| `合规与安全` | 外呼合规、数据、内容审核、行业监管 |
| `模型与平台` | 基座模型、API 调价、推理（若与交付强相关） |
| `政策监管` | 政策、诉讼、采购框架（原有口径可保留） |
| `投融资` | 融资、并购（与商业化相关时） |

未命中时可用现有口径（如 `政策监管`），避免虚构 track。

### 3.2 `impactType`

继续用于粗粒度影响类型（如 产品 / 政策 / 市场 等），与站内筛选一致即可，**不必为「商机」单独拆字段**（第二阶段见 [NEWS_SCHEMA_ROADMAP.md](./NEWS_SCHEMA_ROADMAP.md)）。

### 3.3 `labels`：场景与公司

- **`type: 公司` + `value`**：主体公司名（便于周报 `activeCompanies` 从新闻聚合）。
- **`type: 场景`**（推荐新增使用）：`智能客服` / `外呼` / `联络中心` / `通用对话` 等，便于按场景筛新闻与写周报「对话/语音/联络中心」小节。
- 其他 `type`（政策、技术、主题等）可继续沿用现有写法。

---

## 4. 正文与置信度

- 正文继续用 `AIAbstract`、`Insight` 承担解读；**无需为每条新闻再调模型生成额外摘要**，除非整体改版生成流水线。
- `confidence`：生成端按规则填充即可（如来源权威性、事实是否单一）；不强制用 LLM 重算。

---

## 5. 与周报的衔接

周报写作可参考 [WEEKLY_EDITORIAL_TEMPLATE.md](./WEEKLY_EDITORIAL_TEMPLATE.md)；附录可用 `npm run weekly:digest` 从本周新闻自动生成候选列表与公司频次（见 [scripts/weekly-digest-suggest.mjs](../scripts/weekly-digest-suggest.mjs)）。
