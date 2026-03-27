import { getAllNews } from "@/lib/content";

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

export function NewsDataDashboard() {
  const news = getAllNews();
  const stats = buildStats(news);
  const trackChartRows = Object.entries(stats.byTrack).sort((a, b) => b[1] - a[1]);
  const maxTrackCount = trackChartRows.length > 0 ? trackChartRows[0][1] : 1;

  return (
    <details className="rounded-xl border border-zinc-200 bg-white/60 p-4 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/50">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">数据看板（已折叠）</h2>
            <p className="mt-1 text-xs text-zinc-500">
              统计口径：全站每日新闻 · 数据更新时间：
              {new Date(stats.generatedAt).toLocaleString("zh-CN")} · 新闻总量：{stats.totalNews}
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
                    {entries.slice(0, 6).map((entry) => (
                      <span
                        key={`${type}:${entry.label}`}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {entry.label} ({entry.count})
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </details>
  );
}
