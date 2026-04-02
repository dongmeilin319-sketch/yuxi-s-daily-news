import Link from "next/link";
import { DailyNewsListSection } from "@/components/daily-news-list-section";
import { getAllNews } from "@/lib/content";
import { getSessionUser } from "@/lib/auth";
import { getRatingsByUserAndSlugs } from "@/lib/ratings-store";
import { getSiteUrl } from "@/lib/site";
import { SubpageHeader } from "@/components/subpage-header";

type DatePreset = "all" | "today" | "yesterday" | "week";

type DailyPageProps = {
  searchParams: Promise<{
    preset?: DatePreset;
    date?: string;
    page?: string;
    tracks?: string;
    impacts?: string;
    companies?: string;
    sentiments?: string;
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

function parseMultiParam(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

function serializeMultiParam(values: string[]): string | undefined {
  const clean = Array.from(new Set(values.map((x) => x.trim()).filter(Boolean)));
  return clean.length > 0 ? clean.join(",") : undefined;
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
  const selectedTracks = parseMultiParam(query.tracks);
  const selectedImpacts = parseMultiParam(query.impacts);
  const selectedCompanies = parseMultiParam(query.companies);
  const selectedSentiments = parseMultiParam(query.sentiments);

  const dateFiltered = allNews.filter((item) => {
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

  const trackOptions = Array.from(new Set(dateFiltered.map((item) => item.track))).sort();
  const impactOptions = Array.from(new Set(dateFiltered.map((item) => item.impactType))).sort();
  const companyOptions = Array.from(
    new Set(
      dateFiltered.flatMap((item) =>
        item.labels
          .filter((label) => label.type === "公司" && label.value)
          .map((label) => label.value),
      ),
    ),
  ).sort();
  const sentimentOptions = Array.from(new Set(dateFiltered.map((item) => item.sentiment))).sort();

  const filtered = dateFiltered.filter((item) => {
    const byTrack = selectedTracks.length > 0 ? selectedTracks.includes(item.track) : true;
    const byImpact = selectedImpacts.length > 0 ? selectedImpacts.includes(item.impactType) : true;
    const byCompany =
      selectedCompanies.length > 0
        ? item.labels.some(
            (label) => label.type === "公司" && selectedCompanies.includes(label.value),
          )
        : true;
    const bySentiment =
      selectedSentiments.length > 0 ? selectedSentiments.includes(item.sentiment) : true;
    return byTrack && byImpact && byCompany && bySentiment;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPageRaw = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Number.isFinite(currentPageRaw)
    ? Math.min(Math.max(currentPageRaw, 1), totalPages)
    : 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const sessionUser = await getSessionUser();
  const pageSlugs = pageItems.map((item) => item.slug);
  let slugRatings = new Map<string, number>();
  if (sessionUser && pageSlugs.length > 0) {
    try {
      slugRatings = await getRatingsByUserAndSlugs(sessionUser.id, pageSlugs);
    } catch {
      slugRatings = new Map();
    }
  }

  const slugRatingsRecord = Object.fromEntries(slugRatings.entries());
  const listRows = pageItems.map((item) => ({
    slug: item.slug,
    title: item.title,
    publishAt: item.publishAt,
    collectedAt: item.collectedAt,
    sentiment: item.sentiment,
    track: item.track,
    impactType: item.impactType,
    originalUrl: item.originalUrl,
  }));
  const siteUrl = getSiteUrl();

  function hrefWith(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (preset !== "all") params.set("preset", preset);
    if (customDate) params.set("date", customDate);
    const tracks = serializeMultiParam(selectedTracks);
    const impacts = serializeMultiParam(selectedImpacts);
    const companies = serializeMultiParam(selectedCompanies);
    const sentiments = serializeMultiParam(selectedSentiments);
    if (tracks) params.set("tracks", tracks);
    if (impacts) params.set("impacts", impacts);
    if (companies) params.set("companies", companies);
    if (sentiments) params.set("sentiments", sentiments);
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
      <SubpageHeader
        title="每日新闻"
        subtitle="按日期与多维标签筛选每日条目。"
        englishSubtitle="Daily News"
        activeTab="daily"
      />

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="w-full shrink-0 rounded-lg border border-zinc-200 p-3 md:w-fit md:max-w-sm dark:border-zinc-700">
            <h2 className="text-base font-semibold">日期筛选器</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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

            <form method="get" action="/daily" className="mt-2 flex flex-wrap items-center gap-2">
              {preset !== "all" ? <input type="hidden" name="preset" value={preset} /> : null}
              {selectedTracks.length > 0 ? (
                <input type="hidden" name="tracks" value={serializeMultiParam(selectedTracks)} />
              ) : null}
              {selectedImpacts.length > 0 ? (
                <input type="hidden" name="impacts" value={serializeMultiParam(selectedImpacts)} />
              ) : null}
              {selectedCompanies.length > 0 ? (
                <input type="hidden" name="companies" value={serializeMultiParam(selectedCompanies)} />
              ) : null}
              {selectedSentiments.length > 0 ? (
                <input type="hidden" name="sentiments" value={serializeMultiParam(selectedSentiments)} />
              ) : null}
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
          </div>

          <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <h2 className="text-base font-semibold">高级筛选</h2>
            <p className="mt-1 text-xs text-zinc-500">
              已选{" "}
              {selectedTracks.length +
                selectedImpacts.length +
                selectedCompanies.length +
                selectedSentiments.length}{" "}
              项
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <details className="w-max max-w-full rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                <summary className="cursor-pointer whitespace-nowrap text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300">
                  赛道（多选）
                </summary>
                <div className="mt-2 max-h-24 min-w-full overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                  {trackOptions.map((option) => {
                    const next = selectedTracks.includes(option)
                      ? selectedTracks.filter((v) => v !== option)
                      : [...selectedTracks, option];
                    return (
                      <Link
                        key={option}
                        href={hrefWith({ tracks: serializeMultiParam(next), page: undefined })}
                        className={
                          selectedTracks.includes(option)
                            ? "mb-1 mr-1 inline-block rounded-full border border-indigo-600 bg-indigo-600 px-2 py-0.5 text-[11px] text-white"
                            : "mb-1 mr-1 inline-block rounded-full border px-2 py-0.5 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }
                      >
                        {option}
                      </Link>
                    );
                  })}
                </div>
              </details>

              <details className="w-max max-w-full rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                <summary className="cursor-pointer whitespace-nowrap text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300">
                  影响类型（多选）
                </summary>
                <div className="mt-2 max-h-24 min-w-full overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                  {impactOptions.map((option) => {
                    const next = selectedImpacts.includes(option)
                      ? selectedImpacts.filter((v) => v !== option)
                      : [...selectedImpacts, option];
                    return (
                      <Link
                        key={option}
                        href={hrefWith({ impacts: serializeMultiParam(next), page: undefined })}
                        className={
                          selectedImpacts.includes(option)
                            ? "mb-1 mr-1 inline-block rounded-full border border-emerald-600 bg-emerald-600 px-2 py-0.5 text-[11px] text-white"
                            : "mb-1 mr-1 inline-block rounded-full border px-2 py-0.5 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }
                      >
                        {option}
                      </Link>
                    );
                  })}
                </div>
              </details>

              <details className="w-max max-w-full rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                <summary className="cursor-pointer whitespace-nowrap text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300">
                  公司（多选）
                </summary>
                <div className="mt-2 max-h-24 min-w-full overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                  {companyOptions.map((option) => {
                    const next = selectedCompanies.includes(option)
                      ? selectedCompanies.filter((v) => v !== option)
                      : [...selectedCompanies, option];
                    return (
                      <Link
                        key={option}
                        href={hrefWith({ companies: serializeMultiParam(next), page: undefined })}
                        className={
                          selectedCompanies.includes(option)
                            ? "mb-1 mr-1 inline-block rounded-full border border-violet-600 bg-violet-600 px-2 py-0.5 text-[11px] text-white"
                            : "mb-1 mr-1 inline-block rounded-full border px-2 py-0.5 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }
                      >
                        {option}
                      </Link>
                    );
                  })}
                </div>
              </details>

              <details className="w-max max-w-full rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                <summary className="cursor-pointer whitespace-nowrap text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300">
                  情绪（多选）
                </summary>
                <div className="mt-2 max-h-24 min-w-full overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                  {sentimentOptions.map((option) => {
                    const next = selectedSentiments.includes(option)
                      ? selectedSentiments.filter((v) => v !== option)
                      : [...selectedSentiments, option];
                    return (
                      <Link
                        key={option}
                        href={hrefWith({ sentiments: serializeMultiParam(next), page: undefined })}
                        className={
                          selectedSentiments.includes(option)
                            ? "mb-1 mr-1 inline-block rounded-full border border-sky-600 bg-sky-600 px-2 py-0.5 text-[11px] text-white"
                            : "mb-1 mr-1 inline-block rounded-full border px-2 py-0.5 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }
                      >
                        {option}
                      </Link>
                    );
                  })}
                </div>
              </details>
            </div>

            <div className="mt-2 text-right">
              <Link
                href={hrefWith({
                  tracks: undefined,
                  impacts: undefined,
                  companies: undefined,
                  sentiments: undefined,
                  page: undefined,
                })}
                className="text-xs underline underline-offset-4"
              >
                清空高级筛选
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
          <span>总计 {total} 条</span>
          <span>
            第 {currentPage}/{totalPages} 页
          </span>
        </div>

        <DailyNewsListSection
          siteUrl={siteUrl}
          rows={listRows}
          slugRatings={slugRatingsRecord}
          canRate={Boolean(sessionUser)}
        />

        {pageItems.length === 0 && (
          <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            当前筛选条件下暂无数据，请调整日期或高级筛选条件。
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
