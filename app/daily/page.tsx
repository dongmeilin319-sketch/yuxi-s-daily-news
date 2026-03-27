import Link from "next/link";
import { getAllNews } from "@/lib/content";

type DatePreset = "all" | "today" | "yesterday" | "week";

type DailyPageProps = {
  searchParams: Promise<{
    preset?: DatePreset;
    date?: string;
    page?: string;
  }>;
};

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20;

function toCstShiftedDate(d: Date): Date {
  return new Date(d.getTime() + CST_OFFSET_MS);
}

function cstYmdKey(d: Date): string {
  const x = toCstShiftedDate(d);
  const yyyy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cstDayStartUtcMs(d: Date): number {
  const x = toCstShiftedDate(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

function cstWeekStartUtcMs(now: Date): number {
  const x = toCstShiftedDate(now);
  const baseUtcMs = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const day = x.getUTCDay(); // Sun=0
  const daysSinceMonday = (day + 6) % 7; // Mon=0 ... Sun=6
  return baseUtcMs - daysSinceMonday * DAY_MS;
}

export default async function DailyNewsPage({ searchParams }: DailyPageProps) {
  const query = await searchParams;
  const allNews = getAllNews();
  const now = new Date();
  const todayKey = cstYmdKey(now);
  const yesterdayKey = cstYmdKey(new Date(now.getTime() - DAY_MS));
  const weekStartMs = cstWeekStartUtcMs(now);
  const weekEndMs = weekStartMs + 7 * DAY_MS;

  const preset: DatePreset = query.preset ?? "all";
  const customDate = (query.date ?? "").trim();

  const filtered = allNews.filter((item) => {
    const publish = new Date(item.publishAt);
    const key = cstYmdKey(publish);
    const dayStart = cstDayStartUtcMs(publish);

    if (customDate) {
      return key === customDate;
    }
    if (preset === "today") return key === todayKey;
    if (preset === "yesterday") return key === yesterdayKey;
    if (preset === "week") return dayStart >= weekStartMs && dayStart < weekEndMs;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPageRaw = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Number.isFinite(currentPageRaw)
    ? Math.min(Math.max(currentPageRaw, 1), totalPages)
    : 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  function hrefWith(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (preset !== "all") params.set("preset", preset);
    if (customDate) params.set("date", customDate);
    if (currentPage > 1) params.set("page", String(currentPage));
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/daily?${qs}` : "/daily";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">每日新闻</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          共 {total} 条，每页 {PAGE_SIZE} 条，当前第 {currentPage}/{totalPages} 页。
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">日期筛选器</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "全部" },
              { id: "today", label: "今天" },
              { id: "yesterday", label: "昨天" },
              { id: "week", label: "近7天" },
            ] as const
          ).map((opt) => {
            const active = !customDate && preset === opt.id;
            return (
              <Link
                key={opt.id}
                href={hrefWith({
                  preset: opt.id === "all" ? undefined : opt.id,
                  date: undefined,
                  page: undefined,
                })}
                className={
                  active
                    ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border px-3 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        <form method="get" action="/daily" className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="date" className="text-xs text-zinc-500">
            自定义日期
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={customDate}
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-600"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            应用
          </button>
          <Link href="/daily" className="text-xs underline underline-offset-4">
            清空
          </Link>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
          <span>总计 {total} 条</span>
          <span>
            第 {currentPage}/{totalPages} 页
          </span>
        </div>

        <div className="space-y-2">
          {pageItems.map((item) => (
            <article key={item.slug} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    <Link href={`/news/${item.slug}`} className="hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>发布时间：{new Date(item.publishAt).toLocaleString("zh-CN")}</span>
                    <span>情绪：{item.sentiment}</span>
                  </div>
                </div>
                {item.originalUrl ? (
                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    查看新闻源
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {pageItems.length === 0 && (
          <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            当前筛选条件下暂无数据，请调整日期筛选器。
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={hrefWith({ page: currentPage > 1 ? String(currentPage - 1) : undefined })}
            className={
              currentPage > 1
                ? "rounded-md border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                : "pointer-events-none rounded-md border px-2 py-1 text-xs opacity-40"
            }
          >
            上一页
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map((p) => (
              <Link
                key={p}
                href={hrefWith({ page: p === 1 ? undefined : String(p) })}
                className={
                  p === currentPage
                    ? "rounded-md border border-zinc-900 bg-zinc-900 px-2 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-md border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }
              >
                {p}
              </Link>
            ))}

          <Link
            href={hrefWith({ page: currentPage < totalPages ? String(currentPage + 1) : undefined })}
            className={
              currentPage < totalPages
                ? "rounded-md border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                : "pointer-events-none rounded-md border px-2 py-1 text-xs opacity-40"
            }
          >
            下一页
          </Link>
        </div>
      </section>
    </main>
  );
}
