#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const dailyDir = path.join(root, "content", "daily");
const archiveDir = path.join(root, "content", "archive");
const daysRaw = (process.env.ARCHIVE_DAYS ?? "").trim();
const daysParsed = Number(daysRaw);
const days = daysRaw && !Number.isNaN(daysParsed) && daysParsed > 0 ? daysParsed : 30;

if (!fs.existsSync(dailyDir)) {
  fs.mkdirSync(dailyDir, { recursive: true });
}
fs.mkdirSync(archiveDir, { recursive: true });

const now = Date.now();
const thresholdMs = days * 24 * 60 * 60 * 1000;
const files = fs.readdirSync(dailyDir).filter((name) => name.endsWith(".mdx"));
let moved = 0;

for (const fileName of files) {
  const sourcePath = path.join(dailyDir, fileName);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const { data } = matter(raw);
  const parsed = Date.parse(String(data.date ?? ""));

  if (Number.isNaN(parsed)) {
    continue;
  }

  if (now - parsed > thresholdMs) {
    const targetPath = path.join(archiveDir, fileName);
    if (!fs.existsSync(targetPath)) {
      fs.renameSync(sourcePath, targetPath);
      moved += 1;
    }
  }
}

console.log(`Archive complete. Moved ${moved} files (threshold: ${days} days).`);
