import Link from "next/link";
import { getAllNews } from "@/lib/content";
import { NewsLabels } from "@/components/news-labels";

type TimeRange = "all" | "today" | "week";
type CollectedRange = "all" | "today" | "week";

type HomePageProps = {
  searchParams: Promise<{
    range?: TimeRange;
    collectedRange?: CollectedRange;
    track?: string;
    sentiment?: string;
    company?: string;
    labelType?: string;
    labelValue?: string;
  }>;
};

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function cstWeekStartUtcMs(now: Date): number {
  const x = toCstShiftedDate(now);
  const baseUtcMs = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  // Mon=0 ... Sun=6
  const day = x.getUTCDay(); // Sun=0
  const daysSinceMonday = (day + 6) % 7;
  return baseUtcMs - daysSinceMonday * DAY_MS;
}

function buildStats(items: ReturnType<typeof getAllNews>) {
  const bySentiment: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  const labelCountByType: Record<string, Record<string, number>> = {};

  for (const item of items) {
    bySentiment[item.sentiment] = (bySentiment[item.sentiment] ?? 0) + 1;
    byTrack[item.track] = (byTrack[item.track] ?? 0) + 1;
    for (const label of item.labels) {
      if (!label?.type || !label?.value) continue;
      labelCountByType[label.type] = labelCountByType[label.type] ?? {};
      labelCountByType[label.type][label.value] =
        (labelCountByType[label.type][label.value] ?? 0) + 1;
    }
  }

  const topLabelsByType: Record<string, Array<{ label: string; count: number }>> = {};
  for (const [type, valueCounts] of Object.entries(labelCountByType)) {
    topLabelsByType[type] = Object.entries(valueCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalNews: items.length,
    bySentiment,
    byTrack,
    topLabelsByType,
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const query = await searchParams;
  const news = getAllNews();

  const range: TimeRange = query.range ?? "all";
  const collectedRange: CollectedRange = query.collectedRange ?? "all";
  const now = new Date();
  const todayKey = cstYmdKey(now);
  const weekStartMs = cstWeekStartUtcMs(now);
  const weekEndMs = weekStartMs + 7 * DAY_MS;

  const timeFilteredNews = news.filter((item) => {
    if (range === "all") return true;
    const publish = new Date(item.publishAt);
    if (range === "today") {
      return cstYmdKey(publish) === todayKey;
    }
    const publishCstDayUtcMs = Date.UTC(
      toCstShiftedDate(publish).getUTCFullYear(),
      toCstShiftedDate(publish).getUTCMonth(),
      toCstShiftedDate(publish).getUTCDate(),
    );
    return publishCstDayUtcMs >= weekStartMs && publishCstDayUtcMs < weekEndMs;
  });

  const collectedTimeFilteredNews = timeFilteredNews.filter((item) => {
    if (collectedRange === "all") return true;
    const collected = new Date(item.collectedAt ?? item.publishAt);
    if (collectedRange === "today") {
      return cstYmdKey(collected) === todayKey;
    }
    const collectedCstDayUtcMs = Date.UTC(
      toCstShiftedDate(collected).getUTCFullYear(),
      toCstShiftedDate(collected).getUTCMonth(),
      toCstShiftedDate(collected).getUTCDate(),
    );
    return collectedCstDayUtcMs >= weekStartMs && collectedCstDayUtcMs < weekEndMs;
  });

  const stats = buildStats(collectedTimeFilteredNews);
  const tracks = Array.from(new Set(collectedTimeFilteredNews.map((item) => item.track))).sort();
  const companies = Array.from(
    new Set(
      collectedTimeFilteredNews.flatMap((item) =>
        item.labels
          .filter((label) => label.type === "公司" && label.value)
          .map((label) => label.value),
      ),
    ),
  ).sort();
  const sentiments = ["positive", "neutral", "negative"];

  const filtered = collectedTimeFilteredNews.filter((item) => {
    const byTrack = query.track ? item.track === query.track : true;
    const bySentiment = query.sentiment ? item.sentiment === query.sentiment : true;
    const byCompany = query.company
      ? item.labels.some((label) => label.type === "公司" && label.value === query.company)
      : true;
    const byLabel =
      query.labelType && query.labelValue
        ? item.labels.some(
            (l) => l.type === query.labelType && l.value === query.labelValue,
          )
        : true;
    return byTrack && bySentiment && byCompany && byLabel;
  });

  const trackChartRows = Object.entries(stats.byTrack).sort((a, b) => b[1] - a[1]);
  const maxTrackCount = trackChartRows.length > 0 ? trackChartRows[0][1] : 1;
  const hasAnyFilter = Boolean(
    range !== "all" ||
      collectedRange !== "all" ||
      query.track ||
      query.sentiment ||
      query.company ||
      (query.labelType && query.labelValue),
  );

  function hrefWith(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (range !== "all") params.set("range", range);
    if (collectedRange !== "all") params.set("collectedRange", collectedRange);
    if (query.track) params.set("track", query.track);
    if (query.sentiment) params.set("sentiment", query.sentiment);
    if (query.company) params.set("company", query.company);
    if (query.labelType) params.set("labelType", query.labelType);
    if (query.labelValue) params.set("labelValue", query.labelValue);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dlim&apos;s Wonderland</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          每日自动汇总 AI 行业新闻，提供结构化摘要与洞察。
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/weekly" className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200">
            查看周报
          </Link>
          <Link href="/archive" className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200">
            历史归档
          </Link>
          <Link href="/search" className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200">
            站内搜索
          </Link>
          <Link href="/admin" className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200">
            管理后台
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">时间维度</h2>
            <p className="mt-1 text-xs text-zinc-500">对看板统计、筛选器与新闻列表同时生效。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: "全部" },
                { id: "today", label: "今日" },
                { id: "week", label: "本周" },
              ] as const
            ).map((opt) => {
              const active = range === opt.id;
              return (
                <Link
                  key={opt.id}
                  href={hrefWith({ range: opt.id === "all" ? undefined : opt.id })}
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
        </div>
      </section>

      <details className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">数据看板（已折叠）</h2>
              <p className="mt-1 text-xs text-zinc-500">
                数据更新时间：{new Date(stats.generatedAt).toLocaleString("zh-CN")} · 新闻总量：
                {stats.totalNews}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              点击展开
            </span>
          </div>
        </summary>

        <section className="mt-4 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <h3 className="text-sm font-semibold">分类分布</h3>
              <div className="mt-3 space-y-2">
                {trackChartRows.slice(0, 6).map(([track, count]) => {
                  const total = Math.max(1, stats.totalNews);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={track} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{track}</span>
                        <span className="tabular-nums text-zinc-500">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
                          style={{ width: `${Math.max(8, Math.round((count / maxTrackCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <h3 className="text-sm font-semibold">情绪分布</h3>
              <div className="mt-3 space-y-2 text-xs">
                {Object.entries(stats.bySentiment).map(([sentiment, count]) => {
                  const colorClass =
                    sentiment === "positive"
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : sentiment === "negative"
                        ? "bg-rose-500 dark:bg-rose-400"
                        : "bg-sky-500 dark:bg-sky-400";
                  const total = Math.max(1, stats.totalNews);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={sentiment} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{sentiment}</span>
                        <span className="tabular-nums text-zinc-500">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-1.5 rounded-full ${colorClass}`}
                          style={{ width: `${Math.max(8, Math.round((count / total) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <article className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <h3 className="text-sm font-semibold">标签热点</h3>
            <div className="mt-3 space-y-3">
              {Object.keys(stats.topLabelsByType).length === 0 ? (
                <p className="text-xs text-zinc-500">暂无标签数据。</p>
              ) : (
                Object.entries(stats.topLabelsByType).map(([type, entries]) => (
                  <div key={type} className="space-y-1">
                    <p className="text-[11px] font-medium text-zinc-500">{type}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entries.slice(0, 6).map((entry) => {
                        const active = query.labelType === type && query.labelValue === entry.label;
                        return (
                          <Link
                            key={`${type}:${entry.label}`}
                            href={hrefWith({ labelType: type, labelValue: entry.label })}
                            className={
                              active
                                ? "rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 hover:underline dark:bg-zinc-800 dark:text-zinc-200"
                            }
                          >
                            {entry.label} ({entry.count})
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </details>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">新闻筛选器</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">按采集时间</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "全部" },
                  { id: "today", label: "今日新增" },
                  { id: "week", label: "本周新增" },
                ] as const
              ).map((opt) => {
                const active = collectedRange === opt.id;
                return (
                  <Link
                    key={opt.id}
                    href={hrefWith({ collectedRange: opt.id === "all" ? undefined : opt.id })}
                    className={
                      active
                        ? "rounded-full border border-zinc-900 bg-zinc-900 px-2 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500">按赛道</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={hrefWith({ track: undefined })}
                className={
                  !query.track
                    ? "rounded-full border border-zinc-900 bg-zinc-900 px-2 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }
              >
                全部
              </Link>
              {tracks.map((track) => {
                const active = query.track === track;
                return (
                  <Link
                    key={track}
                    href={hrefWith({ track: active ? undefined : track })}
                    className={
                      active
                        ? "rounded-full border border-indigo-600 bg-indigo-600 px-2 py-1 text-xs text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-zinc-900"
                        : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }
                  >
                    {track}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500">按情绪</p>
            <div className="flex flex-wrap gap-2">
              {sentiments.map((sentiment) => {
                const active = query.sentiment === sentiment;
                return (
                  <Link
                    key={sentiment}
                    href={hrefWith({ sentiment: active ? undefined : sentiment })}
                    className={
                      active
                        ? sentiment === "positive"
                          ? "rounded-full border border-emerald-600 bg-emerald-600 px-2 py-1 text-xs text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-900"
                          : sentiment === "negative"
                            ? "rounded-full border border-rose-600 bg-rose-600 px-2 py-1 text-xs text-white dark:border-rose-400 dark:bg-rose-400 dark:text-zinc-900"
                            : "rounded-full border border-sky-600 bg-sky-600 px-2 py-1 text-xs text-white dark:border-sky-400 dark:bg-sky-400 dark:text-zinc-900"
                        : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }
                  >
                    {sentiment}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500">按公司</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={hrefWith({ company: undefined })}
                className={
                  !query.company
                    ? "rounded-full border border-zinc-900 bg-zinc-900 px-2 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }
              >
                全部
              </Link>
              {companies.map((company) => {
                const active = query.company === company;
                return (
                  <Link
                    key={company}
                    href={hrefWith({ company: active ? undefined : company })}
                    className={
                      active
                        ? "rounded-full border border-violet-600 bg-violet-600 px-2 py-1 text-xs text-white dark:border-violet-400 dark:bg-violet-400 dark:text-zinc-900"
                        : "rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }
                  >
                    {company}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {hasAnyFilter && (
          <div className="mt-3">
            <Link href="/" className="text-xs underline underline-offset-4">
              清空筛选
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-4">
        {filtered.map((item) => (
          <article
            key={item.slug}
            className="rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
          >
            <div className="mb-2 flex items-center gap-3 text-xs text-zinc-500">
              <span>{new Date(item.publishAt).toLocaleDateString("zh-CN")}</span>
              <span>采集：{new Date(item.collectedAt ?? item.publishAt).toLocaleString("zh-CN")}</span>
              <span>赛道：{item.track}</span>
              <span>情绪：{item.sentiment}</span>
              <span>阅读约 {item.readingMinutes} 分钟</span>
              <span>置信度 {item.confidence.toFixed(2)}</span>
            </div>
            <h2 className="text-xl font-semibold">
              <Link href={`/news/${item.slug}`} className="hover:underline">
                <span className="inline-flex items-center gap-2">
                  {cstYmdKey(new Date(item.collectedAt ?? item.publishAt)) === todayKey ? (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                      NEW
                    </span>
                  ) : null}
                  <span>{item.title}</span>
                </span>
              </Link>
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{item.summary}</p>
            <NewsLabels labels={item.labels} />
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            当前筛选条件下暂无数据，请调整筛选项。
          </div>
        )}
      </section>
    </main>
  );
}
