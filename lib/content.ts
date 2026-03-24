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

function ensureContentDir(targetDir: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function parseNewsFile(fileName: string): NewsItem | null {
  const fullPath = path.join(dailyContentDir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
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

export function getAllNews(): NewsItem[] {
  ensureContentDir(dailyContentDir);
  const files = fs.readdirSync(dailyContentDir).filter((name) => name.endsWith(".mdx"));

  return files
    .map(parseNewsFile)
    .filter((item): item is NewsItem => item !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getNewsBySlug(slug: string): NewsItem | null {
  const all = getAllNews();
  return all.find((item) => item.slug === slug) ?? null;
}

export function getAllReviewNews(): NewsItem[] {
  ensureContentDir(reviewContentDir);
  const files = fs.readdirSync(reviewContentDir).filter((name) => name.endsWith(".mdx"));

  return files
    .map((fileName) => {
      const fullPath = path.join(reviewContentDir, fileName);
      const raw = fs.readFileSync(fullPath, "utf8");
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
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getAllArchiveNews(): NewsItem[] {
  ensureContentDir(archiveContentDir);
  const files = fs.readdirSync(archiveContentDir).filter((name) => name.endsWith(".mdx"));

  return files
    .map((fileName) => {
      const fullPath = path.join(archiveContentDir, fileName);
      const raw = fs.readFileSync(fullPath, "utf8");
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
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export type WeeklyItem = WeeklyFrontmatter & {
  body: string;
  readingMinutes: number;
};

function parseWeeklyFile(fileName: string): WeeklyItem | null {
  const fullPath = path.join(weeklyContentDir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
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
  ensureContentDir(weeklyContentDir);
  const files = fs.readdirSync(weeklyContentDir).filter((name) => name.endsWith(".mdx"));

  return files
    .map(parseWeeklyFile)
    .filter((item): item is WeeklyItem => item !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getWeeklyBySlug(slug: string): WeeklyItem | null {
  const all = getAllWeekly();
  return all.find((item) => item.slug === slug) ?? null;
}
