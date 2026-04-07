#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const TITLE_DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000;
const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "spm",
  "_hsenc",
  "_hsmi",
  "ref",
  "ref_src",
  "ref_url",
]);

const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "date must be a valid ISO date string");
const nonEmptyString = z.string().trim().min(1);
const labelSchema = z.object({
  type: nonEmptyString,
  value: nonEmptyString,
});
const newsFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  publishAt: isoDateString,
  collectedAt: isoDateString.optional(),
  summary: nonEmptyString,
  sources: z.array(nonEmptyString).min(1),
  labels: z.array(labelSchema).min(1),
  track: nonEmptyString,
  impactType: nonEmptyString,
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  relatedArticles: z.array(nonEmptyString).optional(),
  coverImage: z.string().optional(),
  originalUrl: z.string().url().optional(),
});

function parseArgs(argv) {
  const args = {
    apply: false,
    deleteMode: false,
    outDir: "reports",
    dedupArchiveDir: "content/archive-duplicates/daily",
  };
  for (const token of argv.slice(2)) {
    if (token === "--apply") args.apply = true;
    else if (token === "--delete") args.deleteMode = true;
    else if (token.startsWith("--out-dir=")) args.outDir = token.slice("--out-dir=".length);
    else if (token.startsWith("--archive-dir="))
      args.dedupArchiveDir = token.slice("--archive-dir=".length);
  }
  return args;
}

function normalizeUrlForDedup(raw) {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    for (const k of Array.from(u.searchParams.keys())) {
      const lk = k.toLowerCase();
      if (TRACKING_QUERY_KEYS.has(lk) || lk.startsWith("utm_")) {
        u.searchParams.delete(k);
      }
    }
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    u.pathname = pathname;
    return u.href;
  } catch {
    return null;
  }
}

function normalizeTitleForDedup(title) {
  return title
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTs(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function chooseWinner(group) {
  return [...group].sort((a, b) => {
    const pub = parseTs(b.publishAt) - parseTs(a.publishAt);
    if (pub !== 0) return pub;
    const col = parseTs(b.collectedAt ?? b.publishAt) - parseTs(a.collectedAt ?? a.publishAt);
    if (col !== 0) return col;
    return a.slug.localeCompare(b.slug);
  })[0];
}

function loadDailyItems(dailyDir) {
  if (!fs.existsSync(dailyDir)) return [];
  const files = fs.readdirSync(dailyDir).filter((x) => x.endsWith(".mdx")).sort();
  const rows = [];
  for (const fileName of files) {
    const fullPath = path.join(dailyDir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(raw);
    const parsed = newsFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`invalid frontmatter: ${fileName}`);
    }
    rows.push({
      fileName,
      fullPath,
      ...parsed.data,
    });
  }
  return rows;
}

function buildDedupPlan(items) {
  const urlGroups = new Map();
  const noUrlItems = [];
  for (const item of items) {
    const key = normalizeUrlForDedup(item.originalUrl);
    if (key) {
      const arr = urlGroups.get(key) ?? [];
      arr.push(item);
      urlGroups.set(key, arr);
    } else {
      noUrlItems.push(item);
    }
  }

  const titleGroups = new Map();
  for (const item of noUrlItems) {
    const nt = normalizeTitleForDedup(item.title);
    if (!nt) continue;
    const bucket = Math.floor(parseTs(item.publishAt) / TITLE_DEDUP_WINDOW_MS);
    const key = `${nt}|${bucket}`;
    const arr = titleGroups.get(key) ?? [];
    arr.push(item);
    titleGroups.set(key, arr);
  }

  const groups = [];
  for (const [key, group] of urlGroups) {
    if (group.length < 2) continue;
    groups.push({ strategy: "url", key, group });
  }
  for (const [key, group] of titleGroups) {
    if (group.length < 2) continue;
    groups.push({ strategy: "title_time_window", key, group });
  }

  const keepBySlug = new Set();
  const duplicateItems = [];
  const reportGroups = [];
  for (const { strategy, key, group } of groups) {
    const winner = chooseWinner(group);
    keepBySlug.add(winner.slug);
    const duplicates = group.filter((g) => g.slug !== winner.slug);
    duplicateItems.push(...duplicates);
    reportGroups.push({
      strategy,
      key,
      canonical: {
        slug: winner.slug,
        fileName: winner.fileName,
        publishAt: winner.publishAt,
        collectedAt: winner.collectedAt ?? winner.publishAt,
        originalUrl: winner.originalUrl ?? null,
      },
      duplicates: duplicates.map((d) => ({
        slug: d.slug,
        fileName: d.fileName,
        publishAt: d.publishAt,
        collectedAt: d.collectedAt ?? d.publishAt,
        originalUrl: d.originalUrl ?? null,
      })),
    });
  }

  const dedupSet = new Set(duplicateItems.map((x) => x.slug));
  return {
    duplicateItems,
    dedupGroups: reportGroups.sort((a, b) => b.duplicates.length - a.duplicates.length),
    duplicateSlugSet: dedupSet,
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function main() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const dailyDir = path.join(root, "content", "daily");
  const outDirAbs = path.join(root, args.outDir);
  const dedupArchiveAbs = path.join(root, args.dedupArchiveDir);

  const items = loadDailyItems(dailyDir);
  const { duplicateItems, dedupGroups, duplicateSlugSet } = buildDedupPlan(items);

  const stamp = nowStamp();
  ensureDir(outDirAbs);
  const reportPath = path.join(outDirAbs, `daily-dedup-report-${stamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? (args.deleteMode ? "apply-delete" : "apply-move") : "dry-run",
    counts: {
      totalDailyFiles: items.length,
      dedupGroups: dedupGroups.length,
      duplicateFiles: duplicateItems.length,
      uniqueAfterDedup: items.length - duplicateSlugSet.size,
    },
    dedupArchiveDir: args.deleteMode ? null : args.dedupArchiveDir,
    groups: dedupGroups,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (args.apply) {
    if (!args.deleteMode) ensureDir(dedupArchiveAbs);
    for (const item of duplicateItems) {
      if (args.deleteMode) {
        fs.rmSync(item.fullPath);
      } else {
        const target = path.join(dedupArchiveAbs, item.fileName);
        fs.renameSync(item.fullPath, target);
      }
    }
  }

  console.log(`Daily files: ${items.length}`);
  console.log(`Dedup groups: ${dedupGroups.length}`);
  console.log(`Duplicate files: ${duplicateItems.length}`);
  console.log(`Unique after dedup: ${items.length - duplicateSlugSet.size}`);
  console.log(`Report: ${path.relative(root, reportPath)}`);
  if (!args.apply) {
    console.log("Dry-run only. No files changed.");
    console.log("Apply move duplicates: npm run daily:dedup:apply");
    console.log("Apply delete duplicates: npm run daily:dedup:apply -- --delete");
  }
}

main();
