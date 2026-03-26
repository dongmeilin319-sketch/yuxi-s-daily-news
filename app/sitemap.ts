import type { MetadataRoute } from "next";
import { getAllNews, getAllWeekly } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

// sitemap 在 Vercel 上可能被误判为 Edge 运行时；显式改为 nodejs 以支持 node:fs 内容读取。
export const runtime = "nodejs";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const news = getAllNews();
  const weekly = getAllWeekly();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/weekly`, lastModified: now },
    { url: `${siteUrl}/search`, lastModified: now },
  ];

  const newsRoutes = news.map((item) => ({
    url: `${siteUrl}/news/${item.slug}`,
    lastModified: new Date(item.publishAt),
  }));

  const weeklyRoutes = weekly.map((item) => ({
    url: `${siteUrl}/weekly/${item.slug}`,
    lastModified: new Date(item.date),
  }));

  return [...staticRoutes, ...newsRoutes, ...weeklyRoutes];
}
