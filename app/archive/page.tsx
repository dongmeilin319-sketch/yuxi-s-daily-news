import Link from "next/link";
import { getAllArchiveNews } from "@/lib/content";

export default function ArchivePage() {
  const items = getAllArchiveNews();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">历史归档</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">展示 30 天前自动归档的内容。</p>
      </header>

      <section className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            暂无归档内容。
          </div>
        ) : (
          items.map((item) => (
            <article key={item.slug} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <h2 className="font-semibold">
                <Link href={`/news/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(item.date).toLocaleDateString("zh-CN")} · 赛道 {item.track}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
