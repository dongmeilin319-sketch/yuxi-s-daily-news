#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const dailyDir = path.join(root, "content", "daily");
const outputPath = path.join(root, "public", "data", "daily-stats.json");

if (!fs.existsSync(dailyDir)) {
  fs.mkdirSync(dailyDir, { recursive: true });
}

const files = fs.readdirSync(dailyDir).filter((name) => name.endsWith(".mdx"));
const bySentiment = {};
const byTrack = {};
const labelCountByType = {};

for (const fileName of files) {
  const raw = fs.readFileSync(path.join(dailyDir, fileName), "utf8");
  const { data } = matter(raw);

  const sentiment = String(data.sentiment ?? "neutral");
  const track = String(data.track ?? "general");
  const labels = Array.isArray(data.labels) ? data.labels : [];

  bySentiment[sentiment] = (bySentiment[sentiment] ?? 0) + 1;
  byTrack[track] = (byTrack[track] ?? 0) + 1;

  for (const label of labels) {
    if (!label || typeof label !== "object") continue;
    const type = String(label.type ?? "").trim();
    const value = String(label.value ?? "").trim();
    if (!type || !value) continue;
    labelCountByType[type] = labelCountByType[type] ?? {};
    labelCountByType[type][value] = (labelCountByType[type][value] ?? 0) + 1;
  }
}

const topLabelsByType = {};
for (const [type, valueCounts] of Object.entries(labelCountByType)) {
  topLabelsByType[type] = Object.entries(valueCounts)
    .map(([value, count]) => ({ label: value, count }))
    .sort((a, b) => Number(b.count) - Number(a.count));
}

const output = {
  generatedAt: new Date().toISOString(),
  totalNews: files.length,
  bySentiment,
  byTrack,
  topLabelsByType,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Stats generated: ${outputPath}`);
