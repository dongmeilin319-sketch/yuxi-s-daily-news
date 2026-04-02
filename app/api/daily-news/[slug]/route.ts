import { NextResponse } from "next/server";
import { serialize } from "next-mdx-remote/serialize";
import { getAllNews, getNewsBySlug } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const mdx = await serialize(item.body, {});

  const allNews = getAllNews();
  const related = allNews
    .filter((candidate) => candidate.slug !== item.slug)
    .map((candidate) => {
      const itemKey = new Set(item.labels.map((l) => `${l.type}:${l.value}`));
      const candidateKey = new Set(candidate.labels.map((l) => `${l.type}:${l.value}`));
      let overlap = 0;
      for (const k of candidateKey) {
        if (itemKey.has(k)) overlap += 1;
      }
      const explicit = item.relatedArticles?.includes(candidate.slug) ? 2 : 0;
      return { candidate, score: overlap + explicit };
    })
    .sort((a, b) => b.score - a.score || +new Date(b.candidate.publishAt) - +new Date(a.candidate.publishAt))
    .slice(0, 3)
    .map((entry) => ({
      slug: entry.candidate.slug,
      title: entry.candidate.title,
      summary: entry.candidate.summary,
    }));

  return NextResponse.json({
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    publishAt: item.publishAt,
    collectedAt: item.collectedAt ?? item.publishAt,
    track: item.track,
    impactType: item.impactType,
    sentiment: item.sentiment,
    confidence: item.confidence,
    originalUrl: item.originalUrl,
    labels: item.labels,
    related,
    mdx,
  });
}
