import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { StickyPageHero } from "@/components/sticky-page-hero";
import { getAllNews, getAllWeekly, getWeeklyBySlug } from "@/lib/content";

type WeeklyDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllWeekly().map((item) => ({ slug: item.slug }));
}

export default async function WeeklyDetailPage({ params }: WeeklyDetailPageProps) {
  const { slug } = await params;
  const item = getWeeklyBySlug(slug);
  const relatedNews = getAllNews().slice(0, 6);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/weekly" className="text-sm text-zinc-600 hover:underline dark:text-zinc-300">
        ← 返回周报列表
      </Link>

      <article className="mt-4 space-y-5">
        <StickyPageHero className="space-y-3">
          <p className="text-sm text-zinc-500">{item.weekLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
        </StickyPageHero>
        <div className="prose prose-zinc max-w-none dark:prose-invert">
          <MDXRemote source={item.body} />
        </div>

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">本周事件时间线（MVP）</h2>
          <ul className="mt-4 space-y-3">
            {relatedNews.map((news) => (
              <li key={news.slug} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-zinc-700 dark:bg-zinc-200" />
                <div>
                  <p className="text-xs text-zinc-500">
                    {new Date(news.publishAt).toLocaleDateString("zh-CN")}
                  </p>
                  <Link href={`/news/${news.slug}`} className="text-sm font-medium hover:underline">
                    {news.title}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
