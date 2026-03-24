import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllNews, getNewsBySlug } from "@/lib/content";
import { AIAbstract, Insight } from "@/components/mdx-blocks";
import { ReadingProgress } from "@/components/reading-progress";
import { ShareCopyButton } from "@/components/share-copy-button";
import { getSiteUrl } from "@/lib/site";

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllNews().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  if (!item) {
    return {};
  }

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/news/${item.slug}`;
  const imageUrl = `${siteUrl}/news/${item.slug}/opengraph-image`;

  return {
    title: item.title,
    description: item.summary,
    alternates: {
      canonical: `/news/${item.slug}`,
    },
    openGraph: {
      type: "article",
      url: pageUrl,
      title: item.title,
      description: item.summary,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary,
      images: [imageUrl],
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  const allNews = getAllNews();

  if (!item) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/news/${item.slug}`;

  const related = allNews
    .filter((candidate) => candidate.slug !== item.slug)
    .map((candidate) => {
      const overlap = candidate.tags.filter((tag) => item.tags.includes(tag)).length;
      const explicit = item.relatedArticles?.includes(candidate.slug) ? 2 : 0;
      return { candidate, score: overlap + explicit };
    })
    .sort((a, b) => b.score - a.score || +new Date(b.candidate.date) - +new Date(a.candidate.date))
    .slice(0, 3)
    .map((entry) => entry.candidate);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <ReadingProgress />
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-300">
        ← 返回首页
      </Link>

      <article className="mt-4 space-y-5">
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <ShareCopyButton title={item.title} summary={item.summary} url={pageUrl} />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span>{new Date(item.date).toLocaleDateString("zh-CN")}</span>
            <span>赛道：{item.track}</span>
            <span>影响类型：{item.impactType}</span>
            <span>情绪：{item.sentiment}</span>
            <span>置信度：{item.confidence.toFixed(2)}</span>
          </div>
        </header>

        <div className="prose prose-zinc max-w-none dark:prose-invert">
          <MDXRemote
            source={item.body}
            components={{
              AIAbstract,
              Insight,
            }}
          />
        </div>

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">相关阅读</h2>
          <div className="mt-3 space-y-3">
            {related.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">暂无相关推荐。</p>
            ) : (
              related.map((entry) => (
                <article key={entry.slug}>
                  <h3 className="font-medium">
                    <Link href={`/news/${entry.slug}`} className="hover:underline">
                      {entry.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{entry.summary}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </article>
    </main>
  );
}
