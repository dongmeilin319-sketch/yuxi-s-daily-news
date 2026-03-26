import fs from "node:fs";
import path from "node:path";
import { getAllNews } from "@/lib/content";

export type DailyStats = {
  generatedAt: string;
  totalNews: number;
  bySentiment: Record<string, number>;
  byTrack: Record<string, number>;
  topLabelsByType: Record<string, Array<{ label: string; count: number }>>;
};

const statsFilePath = path.join(process.cwd(), "public", "data", "daily-stats.json");

function buildStatsFromNews(): DailyStats {
  const news = getAllNews();
  const bySentiment: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  const labelCountByType: Record<string, Record<string, number>> = {};

  for (const item of news) {
    bySentiment[item.sentiment] = (bySentiment[item.sentiment] ?? 0) + 1;
    byTrack[item.track] = (byTrack[item.track] ?? 0) + 1;
    for (const label of item.labels) {
      if (!label?.type || !label?.value) continue;
      labelCountByType[label.type] = labelCountByType[label.type] ?? {};
      labelCountByType[label.type][label.value] =
        (labelCountByType[label.type][label.value] ?? 0) + 1;
    }
  }

  const topLabelsByType: DailyStats["topLabelsByType"] = {};
  for (const [type, valueCounts] of Object.entries(labelCountByType)) {
    topLabelsByType[type] = Object.entries(valueCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalNews: news.length,
    bySentiment,
    byTrack,
    topLabelsByType,
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
