import Link from "next/link";
import { getAllNews } from "@/lib/content";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const keyword = (q ?? "").trim().toLowerCase();
  const news = getAllNews();

  const results = keyword
    ? news.filter((item) => {
        const labelValues = item.labels.map((l) => l.value);
        const haystack = [item.title, item.summary, item.track, item.impactType, ...labelValues]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">站内搜索（MVP）</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">支持标题、摘要、赛道、影响类型，以及标签（按类型/值）的关键词搜索。</p>
      </header>

      <form className="mt-4 flex gap-2" action="/search" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="输入关键词，例如：多模态 / 融资 / Anthropic"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          搜索
        </button>
      </form>

      <section className="mt-6 space-y-3">
        {keyword.length === 0 ? (
          <p className="text-sm text-zinc-500">请输入关键词开始搜索。</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-zinc-500">未找到相关结果。</p>
        ) : (
          results.map((item) => (
            <article key={item.slug} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <h2 className="font-semibold">
                <Link href={`/news/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
