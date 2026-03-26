import { getAllNews } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

// 强制使用 Node.js 运行时，避免 Vercel/Next 将其误判为 Edge（Edge 不支持 node:fs）。
export const runtime = "nodejs";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const news = getAllNews().slice(0, 50);

  const items = news
    .map(
      (item) => `
      <item>
        <title>${escapeXml(item.title)}</title>
        <link>${siteUrl}/news/${item.slug}</link>
        <guid>${siteUrl}/news/${item.slug}</guid>
        <pubDate>${new Date(item.publishAt).toUTCString()}</pubDate>
        <description>${escapeXml(item.summary)}</description>
      </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>AI Intelligence Hub</title>
    <link>${siteUrl}</link>
    <description>AI 行业新闻聚合与结构化洞察</description>
    <language>zh-CN</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
