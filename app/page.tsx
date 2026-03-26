import Link from "next/link";
import { getAllNews } from "@/lib/content";
import { getDailyStats } from "@/lib/stats";
import { SubscribeForm } from "@/components/subscribe-form";
import { NewsLabels } from "@/components/news-labels";

type HomePageProps = {
  searchParams: Promise<{
    track?: string;
    sentiment?: string;
    labelType?: string;
    labelValue?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const query = await searchParams;
  const news = getAllNews();
  const stats = getDailyStats();

  const tracks = Array.from(new Set(news.map((item) => item.track))).sort();
  const sentiments = ["positive", "neutral", "negative"];

  const filtered = news.filter((item) => {
    const byTrack = query.track ? item.track === query.track : true;
    const bySentiment = query.sentiment ? item.sentiment === query.sentiment : true;
    const byLabel =
      query.labelType && query.labelValue
        ? item.labels.some(
            (l) => l.type === query.labelType && l.value === query.labelValue,
          )
        : true;
    return byTrack && bySentiment && byLabel;
  });

  const trackChartRows = Object.entries(stats.byTrack).sort((a, b) => b[1] - a[1]);
  const maxTrackCount = trackChartRows.length > 0 ? trackChartRows[0][1] : 1;
  const hasAnyFilter = Boolean(query.track || query.sentiment || (query.labelType && query.labelValue));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Intelligence Hub</h1>
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
        <h2 className="text-lg font-semibold">邮件订阅</h2>
        <p className="mt-1 text-xs text-zinc-500">
          留下邮箱以接收更新提醒；未配置 Webhook 时为占位模式，不会外发真实邮件。
        </p>
        <SubscribeForm />
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">类别分布（首版可视化）</h2>
        <p className="mt-1 text-xs text-zinc-500">
          数据更新时间：{new Date(stats.generatedAt).toLocaleString("zh-CN")}
        </p>
        <div className="mt-4 space-y-3">
          {trackChartRows.map(([track, count]) => (
            <div key={track} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{track}</span>
                <span className="text-zinc-500">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-zinc-700 dark:bg-zinc-300"
                  style={{ width: `${Math.max(8, Math.round((count / maxTrackCount) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">情绪分布</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(stats.bySentiment).map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <span>{sentiment}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">标签分布（按类型）</h2>
          <div className="mt-3 space-y-4">
            {Object.keys(stats.topLabelsByType).length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">暂无标签数据。</p>
            ) : (
              Object.entries(stats.topLabelsByType).map(([type, entries]) => (
                <div key={type} className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">{type}</p>
                  <div className="flex flex-wrap gap-2">
                    {entries.map((entry) => (
                      <Link
                        key={`${type}:${entry.label}`}
                        href={`/?labelType=${encodeURIComponent(type)}&labelValue=${encodeURIComponent(entry.label)}`}
                        className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:underline dark:bg-zinc-800 dark:text-zinc-200 dark:hover:underline"
                      >
                        {entry.label} ({entry.count})
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">筛选器</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">按赛道</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800">
                全部
              </Link>
              {tracks.map((track) => {
                const params = new URLSearchParams(query as Record<string, string>);
                params.set("track", track);
                return (
                  <Link
                    key={track}
                    href={`/?${params.toString()}`}
                    className="rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                const params = new URLSearchParams(query as Record<string, string>);
                params.set("sentiment", sentiment);
                return (
                  <Link
                    key={sentiment}
                    href={`/?${params.toString()}`}
                    className="rounded-full border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {sentiment}
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
              <span>赛道：{item.track}</span>
              <span>情绪：{item.sentiment}</span>
              <span>阅读约 {item.readingMinutes} 分钟</span>
              <span>置信度 {item.confidence.toFixed(2)}</span>
            </div>
            <h2 className="text-xl font-semibold">
              <Link href={`/news/${item.slug}`} className="hover:underline">
                {item.title}
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
