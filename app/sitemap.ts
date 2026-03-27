import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

// sitemap 在 Vercel 上可能被误判为 Edge 运行时；显式改为 nodejs 以支持 node:fs 内容读取。
export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/daily`, lastModified: now },
    { url: `${siteUrl}/weekly`, lastModified: now },
    { url: `${siteUrl}/search`, lastModified: now },
  ];

  try {
    // 动态加载：避免在 Edge 运行时因 node:fs 顶层导入而直接 500（try/catch 无法捕获模块加载错误）。
    const { getAllNews, getAllWeekly } = await import("@/lib/content");
    const news = getAllNews();
    const weekly = getAllWeekly();

    const newsRoutes = news.map((item) => ({
      url: `${siteUrl}/news/${item.slug}`,
      lastModified: new Date(item.publishAt),
    }));

    const weeklyRoutes = weekly.map((item) => ({
      url: `${siteUrl}/weekly/${item.slug}`,
      lastModified: new Date(item.date),
    }));

    return [...staticRoutes, ...newsRoutes, ...weeklyRoutes];
  } catch {
    // 降级：至少返回静态路由，确保 sitemap 永远可用。
    return staticRoutes;
  }
}
