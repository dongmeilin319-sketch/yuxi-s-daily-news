import Link from "next/link";
import { getAllWeekly } from "@/lib/content";
import { NewsDataDashboard } from "@/components/news-data-dashboard";

export default function WeeklyPage() {
  const weekly = getAllWeekly();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">周报</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          每周自动生成的 AI 行业周报，支持回顾关键事件与趋势变化。
        </p>
      </header>

      <div className="mt-6">
        <NewsDataDashboard />
      </div>

      <section className="mt-6 space-y-4">
        {weekly.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            暂无周报内容，请等待自动生成或手动补充 `content/weekly`。
          </div>
        ) : (
          weekly.map((item) => (
            <article
              key={item.slug}
              className="rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            >
              <p className="text-xs text-zinc-500">{item.weekLabel}</p>
              <h2 className="mt-1 text-xl font-semibold">
                <Link href={`/weekly/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{item.summary}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
