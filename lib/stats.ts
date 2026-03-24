import fs from "node:fs";
import path from "node:path";
import { getAllNews } from "@/lib/content";

export type DailyStats = {
  generatedAt: string;
  totalNews: number;
  bySentiment: Record<string, number>;
  byTrack: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
};

const statsFilePath = path.join(process.cwd(), "public", "data", "daily-stats.json");

function buildStatsFromNews(): DailyStats {
  const news = getAllNews();
  const bySentiment: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  const tagCount: Record<string, number> = {};

  for (const item of news) {
    bySentiment[item.sentiment] = (bySentiment[item.sentiment] ?? 0) + 1;
    byTrack[item.track] = (byTrack[item.track] ?? 0) + 1;
    for (const tag of item.tags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    totalNews: news.length,
    bySentiment,
    byTrack,
    topTags,
  };
}

export function getDailyStats(): DailyStats {
  if (!fs.existsSync(statsFilePath)) {
    return buildStatsFromNews();
  }

  try {
    const raw = fs.readFileSync(statsFilePath, "utf8");
    return JSON.parse(raw) as DailyStats;
  } catch {
    return buildStatsFromNews();
  }
}
