import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import {
  newsFrontmatterSchema,
  weeklyFrontmatterSchema,
  type NewsFrontmatter,
  type WeeklyFrontmatter,
} from "@/lib/schema";

export type NewsItem = NewsFrontmatter & {
  body: string;
  readingMinutes: number;
};

const dailyContentDir = path.join(process.cwd(), "content", "daily");
const weeklyContentDir = path.join(process.cwd(), "content", "weekly");
const reviewContentDir = path.join(process.cwd(), "content", "review");
const archiveContentDir = path.join(process.cwd(), "content", "archive");

function readMdxFilesFromDir(dir: string): string[] {
  // Vercel runtime 通常不允许写入磁盘；目录不存在时应当直接视为空。
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"));
  } catch {
    // 在 serverless/受限运行时，可能出现目录存在但不可读/不可访问等情况。
    // sitemap/rss/页面应当尽量可用，因此这里降级为空集合。
    return [];
  }
}

function parseNewsFile(fileName: string): NewsItem | null {
  const fullPath = path.join(dailyContentDir, fileName);
  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, "utf8");
  } catch {
    return null;
  }
  const { data, content } = matter(raw);
  const parsed = newsFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[content] invalid daily article ${fileName}`, parsed.error.flatten().fieldErrors);
    return null;
  }

  const stats = readingTime(content);

  return {
    ...parsed.data,
    body: content,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
  };
}

/** 无 originalUrl 时按标题去重的时间桶宽度（毫秒） */
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

function normalizeUrlForDedup(raw: string | undefined): string | null {
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
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    u.pathname = pathname;
    return u.href;
  } catch {
    return null;
  }
}

function normalizeTitleForDedup(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publishMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function collectedMs(item: NewsItem): number {
  const t = Date.parse(item.collectedAt ?? item.publishAt);
  return Number.isFinite(t) ? t : 0;
}

function pickCanonicalFromGroup(group: NewsItem[]): NewsItem {
  const sorted = [...group].sort((a, b) => {
    const pub = publishMs(b.publishAt) - publishMs(a.publishAt);
    if (pub !== 0) return pub;
    const col = collectedMs(b) - collectedMs(a);
    if (col !== 0) return col;
    return a.slug.localeCompare(b.slug);
  });
  return sorted[0]!;
}

function buildDailyDedupIndex(raw: NewsItem[]): {
  uniqueSorted: NewsItem[];
  aliasToCanonical: Map<string, string>;
} {
  const urlGroups = new Map<string, NewsItem[]>();
  const noUrlItems: NewsItem[] = [];

  for (const item of raw) {
    const uk = normalizeUrlForDedup(item.originalUrl);
    if (uk) {
      const arr = urlGroups.get(uk) ?? [];
      arr.push(item);
      urlGroups.set(uk, arr);
    } else {
      noUrlItems.push(item);
    }
  }

  const titleGroups = new Map<string, NewsItem[]>();
  for (const item of noUrlItems) {
    const nt = normalizeTitleForDedup(item.title);
    if (!nt) continue;
    const bucket = Math.floor(publishMs(item.publishAt) / TITLE_DEDUP_WINDOW_MS);
    const key = `${nt}|${bucket}`;
    const arr = titleGroups.get(key) ?? [];
    arr.push(item);
    titleGroups.set(key, arr);
  }

  const canonicalSlugs = new Set<string>();
  const aliasToCanonical = new Map<string, string>();

  for (const group of urlGroups.values()) {
    const winner = pickCanonicalFromGroup(group);
    canonicalSlugs.add(winner.slug);
    for (const it of group) {
      if (it.slug !== winner.slug) {
        aliasToCanonical.set(it.slug, winner.slug);
      }
    }
  }

  for (const group of titleGroups.values()) {
    const winner = pickCanonicalFromGroup(group);
    canonicalSlugs.add(winner.slug);
    for (const it of group) {
      if (it.slug !== winner.slug) {
        aliasToCanonical.set(it.slug, winner.slug);
      }
    }
  }

  const uniqueSorted = raw
    .filter((it) => canonicalSlugs.has(it.slug))
    .sort((a, b) => publishMs(b.publishAt) - publishMs(a.publishAt));

  return { uniqueSorted, aliasToCanonical };
}

type DailyNewsDedupIndex = {
  uniqueSorted: NewsItem[];
  aliasToCanonical: Map<string, string>;
  rawBySlug: Map<string, NewsItem>;
  canonicalItemBySlug: Map<string, NewsItem>;
};

let productionDedupCache: DailyNewsDedupIndex | null = null;

function buildDailyNewsDedupIndexFromDisk(): DailyNewsDedupIndex {
  const files = readMdxFilesFromDir(dailyContentDir);
  const raw = files
    .map(parseNewsFile)
    .filter((item): item is NewsItem => item !== null);
  const rawBySlug = new Map(raw.map((i) => [i.slug, i]));
  const { uniqueSorted, aliasToCanonical } = buildDailyDedupIndex(raw);
  const canonicalItemBySlug = new Map(uniqueSorted.map((i) => [i.slug, i]));
  return { uniqueSorted, aliasToCanonical, rawBySlug, canonicalItemBySlug };
}

function getDailyNewsDedupIndex(): DailyNewsDedupIndex {
  if (process.env.NODE_ENV === "production") {
    if (!productionDedupCache) {
      productionDedupCache = buildDailyNewsDedupIndexFromDisk();
    }
    return productionDedupCache;
  }
  return buildDailyNewsDedupIndexFromDisk();
}

export type ResolvedNewsBySlug = {
  item: NewsItem;
  /** 去重后的主 slug（与 item.slug 一致） */
  canonicalSlug: string;
};

/**
 * 按 slug 解析新闻：重复条目会映射到 canonical 对应的 NewsItem（正文与元数据均为保留条）。
 */
export function resolveNewsBySlug(slug: string): ResolvedNewsBySlug | null {
  const { aliasToCanonical, rawBySlug, canonicalItemBySlug } = getDailyNewsDedupIndex();
  if (!rawBySlug.has(slug)) return null;
  const canonicalSlug = aliasToCanonical.get(slug) ?? slug;
  const winner = canonicalItemBySlug.get(canonicalSlug);
  if (!winner) return null;
  return { item: winner, canonicalSlug: winner.slug };
}

export function getAllNews(): NewsItem[] {
  return getDailyNewsDedupIndex().uniqueSorted;
}

export function getNewsBySlug(slug: string): NewsItem | null {
  return resolveNewsBySlug(slug)?.item ?? null;
}

export function getAllReviewNews(): NewsItem[] {
  const files = readMdxFilesFromDir(reviewContentDir);

  return files
    .map((fileName) => {
      const fullPath = path.join(reviewContentDir, fileName);
      let raw: string;
      try {
        raw = fs.readFileSync(fullPath, "utf8");
      } catch {
        return null;
      }
      const { data, content } = matter(raw);
      const parsed = newsFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(`[content] invalid review article ${fileName}`, parsed.error.flatten().fieldErrors);
        return null;
      }
      const stats = readingTime(content);
      return {
        ...parsed.data,
        body: content,
        readingMinutes: Math.max(1, Math.round(stats.minutes)),
      };
    })
    .filter((item): item is NewsItem => item !== null)
    .sort((a, b) => +new Date(b.publishAt) - +new Date(a.publishAt));
}

export function getAllArchiveNews(): NewsItem[] {
  const files = readMdxFilesFromDir(archiveContentDir);

  return files
    .map((fileName) => {
      const fullPath = path.join(archiveContentDir, fileName);
      let raw: string;
      try {
        raw = fs.readFileSync(fullPath, "utf8");
      } catch {
        return null;
      }
      const { data, content } = matter(raw);
      const parsed = newsFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(`[content] invalid archive article ${fileName}`, parsed.error.flatten().fieldErrors);
        return null;
      }
      const stats = readingTime(content);
      return {
        ...parsed.data,
        body: content,
        readingMinutes: Math.max(1, Math.round(stats.minutes)),
      };
    })
    .filter((item): item is NewsItem => item !== null)
    .sort((a, b) => +new Date(b.publishAt) - +new Date(a.publishAt));
}

export type WeeklyItem = WeeklyFrontmatter & {
  body: string;
  readingMinutes: number;
};

function parseWeeklyFile(fileName: string): WeeklyItem | null {
  const fullPath = path.join(weeklyContentDir, fileName);
  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, "utf8");
  } catch {
    return null;
  }
  const { data, content } = matter(raw);
  const parsed = weeklyFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[content] invalid weekly article ${fileName}`, parsed.error.flatten().fieldErrors);
    return null;
  }

  const stats = readingTime(content);
  return {
    ...parsed.data,
    body: content,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
  };
}

export function getAllWeekly(): WeeklyItem[] {
  const files = readMdxFilesFromDir(weeklyContentDir);

  return files
    .map(parseWeeklyFile)
    .filter((item): item is WeeklyItem => item !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getWeeklyBySlug(slug: string): WeeklyItem | null {
  const all = getAllWeekly();
  return all.find((item) => item.slug === slug) ?? null;
}
