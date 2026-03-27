#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const dailyDir = path.join(root, "content", "daily");
const removedDir = path.join(root, "content", "removed", "dedup", "daily");

function normalizeUrlKey(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    const dropParams = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
    ]);
    const kept = [];
    for (const [k, val] of u.searchParams.entries()) {
      if (!dropParams.has(k.toLowerCase())) {
        kept.push([k, val]);
      }
    }
    kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
    u.search = "";
    for (const [k, val] of kept) {
      u.searchParams.append(k, val);
    }
    u.hash = "";
    u.pathname = (u.pathname || "/").replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return v;
  }
}

function toTs(value) {
  const t = Date.parse(String(value ?? ""));
  return Number.isNaN(t) ? 0 : t;
}

if (!fs.existsSync(dailyDir)) {
  console.log("daily 目录不存在，无需清理。");
  process.exit(0);
}
fs.mkdirSync(removedDir, { recursive: true });

const files = fs.readdirSync(dailyDir).filter((n) => n.endsWith(".mdx"));
const byUrl = new Map();

for (const fileName of files) {
  const fullPath = path.join(dailyDir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data } = matter(raw);
  const key = normalizeUrlKey(data.originalUrl);
  if (!key) continue;
  if (!byUrl.has(key)) byUrl.set(key, []);
  byUrl.get(key).push({
    fileName,
    fullPath,
    publishAt: toTs(data.publishAt || data.date || data.collectedAt),
    collectedAt: toTs(data.collectedAt),
  });
}

let moved = 0;
for (const [, items] of byUrl.entries()) {
  if (items.length <= 1) continue;
  items.sort((a, b) => b.publishAt - a.publishAt || b.collectedAt - a.collectedAt || a.fileName.localeCompare(b.fileName));
  const keep = items[0];
  for (const d of items.slice(1)) {
    const targetPath = path.join(removedDir, d.fileName);
    if (!fs.existsSync(targetPath)) {
      fs.renameSync(d.fullPath, targetPath);
      moved += 1;
      console.log(`[dedup] moved duplicate: ${d.fileName} (keep: ${keep.fileName})`);
    }
  }
}

console.log(`Duplicate cleanup finished. Moved ${moved} files to content/removed/dedup/daily.`);
