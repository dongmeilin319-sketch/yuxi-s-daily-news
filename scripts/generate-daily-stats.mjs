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
const tagCount = {};

for (const fileName of files) {
  const raw = fs.readFileSync(path.join(dailyDir, fileName), "utf8");
  const { data } = matter(raw);

  const sentiment = String(data.sentiment ?? "neutral");
  const track = String(data.track ?? "general");
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];

  bySentiment[sentiment] = (bySentiment[sentiment] ?? 0) + 1;
  byTrack[track] = (byTrack[track] ?? 0) + 1;

  for (const tag of tags) {
    tagCount[tag] = (tagCount[tag] ?? 0) + 1;
  }
}

const topTags = Object.entries(tagCount)
  .map(([tag, count]) => ({ tag, count }))
  .sort((a, b) => Number(b.count) - Number(a.count))
  .slice(0, 8);

const output = {
  generatedAt: new Date().toISOString(),
  totalNews: files.length,
  bySentiment,
  byTrack,
  topTags,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Stats generated: ${outputPath}`);
