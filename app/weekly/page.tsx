import Link from "next/link";
import { DateRangeFilterCard, type DatePresetId } from "@/components/date-range-filter-card";
import { SubpageHeader } from "@/components/subpage-header";
import { getSessionUser } from "@/lib/auth";
import { getAllWeekly } from "@/lib/content";
import { cstYmdKey } from "@/lib/cst-wall-clock";
import {
  cstDayStartUtcMsFromDate,
  cstWeekRangeFromDate,
  formatWeeklyCompactRange,
  formatWeeklyListTitle,
  rangesOverlap,
  weeklyItemWeekRange,
} from "@/lib/weekly-week";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20;

type WeeklyPageProps = {
  searchParams: Promise<{
    preset?: string;
    date?: string;
    page?: string;
  }>;
};

function parsePreset(raw: string | undefined): DatePresetId {
  if (raw === "today" || raw === "yesterday" || raw === "week") return raw;
  return "all";
}

function weeklyHref(next: { preset?: DatePresetId; date?: string; page?: string }) {
  const params = new URLSearchParams();
  const p = next.preset ?? "all";
  if (p !== "all") params.set("preset", p);
  if (next.date) params.set("date", next.date);
  if (next.page && Number.parseInt(next.page, 10) > 1) params.set("page", next.page);
  const qs = params.toString();
  return qs ? `/weekly?${qs}` : "/weekly";
}

function weeklyMatchesFilter(
  dateIso: string,
  preset: DatePresetId,
  customDate: string,
  now: Date,
): boolean {
  const { startMs: ws, endMs: we } = weeklyItemWeekRange(dateIso);

  if (customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
    const anchor = new Date(`${customDate}T12:00:00+08:00`);
    const ds = cstDayStartUtcMsFromDate(anchor);
    return rangesOverlap(ws, we, ds, ds + DAY_MS);
  }

  if (preset === "today") {
    const t0 = cstDayStartUtcMsFromDate(now);
    return rangesOverlap(ws, we, t0, t0 + DAY_MS);
  }
  if (preset === "yesterday") {
    const y0 = cstDayStartUtcMsFromDate(new Date(now.getTime() - DAY_MS));
    return rangesOverlap(ws, we, y0, y0 + DAY_MS);
  }
  if (preset === "week") {
    const { startMs, endMs } = cstWeekRangeFromDate(now);
    return rangesOverlap(ws, we, startMs, endMs);
  }
  return true;
}

export default async function WeeklyPage({ searchParams }: WeeklyPageProps) {
  const query = await searchParams;
  const allWeekly = getAllWeekly();
  const now = new Date();
  const preset = parsePreset(query.preset);
  const customDate = (query.date ?? "").trim();

  const filtered = allWeekly.filter((item) => weeklyMatchesFilter(item.date, preset, customDate, now));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPageRaw = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Number.isFinite(currentPageRaw)
    ? Math.min(Math.max(currentPageRaw, 1), totalPages)
    : 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const sessionUser = await getSessionUser();

  function listHref(page: number) {
    return weeklyHref({
      preset: preset === "all" ? undefined : preset,
      date: customDate || undefined,
      page: page > 1 ? String(page) : undefined,
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <SubpageHeader
        title="周报"
        subtitle="按与每日新闻相同的时间维度筛选周报；列表按周展示，每页 20 条。"
        englishSubtitle="Weekly Report"
        activeTab="weekly"
        sessionUsername={sessionUser?.username}
        sessionPermissions={sessionUser?.permissions}
      />

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <DateRangeFilterCard
          action="/weekly"
          preset={preset}
          customDate={customDate}
          presetHref={(id) =>
            weeklyHref({
              preset: id === "all" ? undefined : id,
              date: undefined,
              page: undefined,
            })
          }
          clearHref="/weekly"
        />
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>总计 {total} 条（东八区自然周与所选日期重叠即命中）</span>
          <span>
            第 {currentPage}/{totalPages} 页
          </span>
        </div>

        <div className="space-y-4">
          {pageItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              当前筛选条件下暂无周报，请调整日期或等待内容入库。
            </div>
          ) : (
            pageItems.map((item) => {
              const { startMs } = weeklyItemWeekRange(item.date);
              const listTitle = formatWeeklyListTitle(startMs);
              const rangeCompact = formatWeeklyCompactRange(startMs);
              const companies = item.activeCompanies?.length
                ? item.activeCompanies.join("、")
                : "暂无收录";

              return (
                <article
                  key={item.slug}
                  className="rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                >
                  <h2 className="text-xl font-semibold">
                    <Link href={`/weekly/${item.slug}`} className="hover:underline">
                      {listTitle}
                    </Link>
                  </h2>
                  <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">本周报起始日期：</span>
                      {rangeCompact}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">本周活跃公司：</span>
                      {companies}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{item.summary}</p>
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                    原始标识：{item.weekLabel} · {cstYmdKey(new Date(item.date))}
                  </p>
                </article>
              );
            })
          )}
        </div>

        {total > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={listHref(currentPage - 1)}
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
                  href={listHref(p)}
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
              href={listHref(currentPage + 1)}
              className={
                currentPage < totalPages
                  ? "rounded-md border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : "pointer-events-none rounded-md border px-2 py-1 text-xs opacity-40"
              }
            >
              下一页
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
