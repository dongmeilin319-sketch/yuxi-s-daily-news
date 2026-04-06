#!/usr/bin/env node
/**
 * 按东八区自然周从 content/daily 聚合新闻，输出 Markdown 片段：
 * - 本周全部条目（标题 + 站内链接）
 * - 「对话/语音/联络中心」相关候选（标题/摘要/track/labels 关键词命中）
 * - 公司名频次 TopN（labels type=公司），供周报 activeCompanies 草稿
 *
 * 用法：
 *   node ./scripts/weekly-digest-suggest.mjs
 *   node ./scripts/weekly-digest-suggest.mjs --date=2026-03-26
 *   node ./scripts/weekly-digest-suggest.mjs --top=15
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const FOCUS_KEYWORDS = [
  "contact center",
  "call center",
  "voice agent",
  "conversational",
  "outbound",
  "ivr",
  "ccaas",
  "cpaas",
  "customer support",
  "virtual agent",
  "智能客服",
  "外呼",
  "联络中心",
  "呼叫中心",
  "语音",
  "对话",
  "质检",
  "人机协作",
  "联络",
];

function toCstShiftedDate(d) {
  return new Date(d.getTime() + CST_OFFSET_MS);
}

function cstWeekStartUtcMs(d) {
  const x = toCstShiftedDate(d);
  const baseUtcMs = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const day = x.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return baseUtcMs - daysSinceMonday * DAY_MS;
}

function cstWeekRangeFromAnchor(anchor) {
  const startMs = cstWeekStartUtcMs(anchor);
  return { startMs, endMs: startMs + 7 * DAY_MS };
}

/** 与每日新闻筛选一致：publish 所在东八区日历日的 day-start（UTC 分量编码） */
function cstDayStartUtcMs(d) {
  const x = toCstShiftedDate(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

function yyyymmdd(ms) {
  const x = toCstShiftedDate(new Date(ms));
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const d = String(x.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function publishInstantMs(data) {
  const raw = data.publishAt ?? data.date;
  if (!raw) return NaN;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : NaN;
}

function textHaystack(data) {
  const labels = Array.isArray(data.labels) ? data.labels : [];
  const labelStr = labels
    .map((l) => `${l?.type ?? ""} ${l?.value ?? ""}`)
    .join(" ");
  return `${data.title ?? ""} ${data.summary ?? ""} ${data.track ?? ""} ${labelStr}`.toLowerCase();
}

function matchesFocus(data) {
  const h = textHaystack(data);
  return FOCUS_KEYWORDS.some((k) => h.includes(k.toLowerCase()));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let dateStr = null;
  let topN = 20;
  for (const a of args) {
    if (a.startsWith("--date=")) dateStr = a.slice("--date=".length).trim();
    else if (a.startsWith("--top=")) topN = Math.max(1, Number.parseInt(a.slice("--top=".length), 10) || 20);
  }
  return { dateStr, topN };
}

const root = process.cwd();
const dailyDir = path.join(root, "content", "daily");

const { dateStr, topN } = parseArgs();
const anchor = dateStr ? new Date(`${dateStr}T12:00:00+08:00`) : new Date();
const { startMs, endMs } = cstWeekRangeFromAnchor(anchor);
const rangeLabel = `${yyyymmdd(startMs)}-${yyyymmdd(startMs + 6 * DAY_MS)}`;

const files = fs.existsSync(dailyDir)
  ? fs.readdirSync(dailyDir).filter((n) => n.endsWith(".mdx"))
  : [];

const inWeek = [];
const companyCounts = new Map();

for (const fileName of files) {
  const raw = fs.readFileSync(path.join(dailyDir, fileName), "utf8");
  const { data } = matter(raw);
  const inst = publishInstantMs(data);
  if (!Number.isFinite(inst)) continue;
  const dayStart = cstDayStartUtcMs(new Date(inst));
  if (dayStart < startMs || dayStart >= endMs) continue;

  const slug = String(data.slug ?? "").trim();
  const title = String(data.title ?? "").trim();
  if (!slug || !title) continue;

  inWeek.push({ slug, title, summary: String(data.summary ?? "").trim(), data });

  const labels = Array.isArray(data.labels) ? data.labels : [];
  for (const l of labels) {
    if (String(l?.type ?? "").trim() !== "公司") continue;
    const v = String(l?.value ?? "").trim();
    if (!v) continue;
    companyCounts.set(v, (companyCounts.get(v) ?? 0) + 1);
  }
}

inWeek.sort((a, b) => publishInstantMs(b.data) - publishInstantMs(a.data));

const focusItems = inWeek.filter((x) => matchesFocus(x.data));

const topCompanies = [...companyCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, topN);

const lines = [];
lines.push(`<!-- weekly-digest-suggest：东八区周 ${rangeLabel}，共 ${inWeek.length} 条 -->`);
lines.push("");
lines.push(`## 附录 A：本周新闻条目（${inWeek.length}）`);
lines.push("");
for (const x of inWeek) {
  lines.push(`- [${x.title}](/news/${x.slug})`);
}
lines.push("");
lines.push(`## 附录 B：对话 / 语音 / 联络中心相关候选（${focusItems.length}）`);
lines.push("");
if (focusItems.length === 0) {
  lines.push("_本周无关键词命中条目；可改脚本内 FOCUS_KEYWORDS 或人工从附录 A 挑选。_");
} else {
  for (const x of focusItems) {
    lines.push(`- [${x.title}](/news/${x.slug})`);
  }
}
lines.push("");
lines.push("## 附录 C：`activeCompanies` 草稿（按本周出现频次）");
lines.push("");
lines.push("```yaml");
lines.push("activeCompanies:");
if (topCompanies.length === 0) {
  lines.push("  []");
} else {
  for (const [name] of topCompanies) {
    lines.push(`  - "${name.replace(/"/g, '\\"')}"`);
  }
}
lines.push("```");
lines.push("");

const out = lines.join("\n");
process.stdout.write(out);
