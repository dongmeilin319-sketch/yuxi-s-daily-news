import Link from "next/link";
import { getAllNews } from "@/lib/content";

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

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

const SENTIMENT_ORDER = ["positive", "neutral", "negative"] as const;

function sentimentLabelZh(s: string): string {
  if (s === "positive") return "积极";
  if (s === "negative") return "消极";
  if (s === "neutral") return "中性";
  return s;
}

function sentimentLabelEn(s: string): string {
  if (s === "positive") return "Positive";
  if (s === "negative") return "Negative";
  if (s === "neutral") return "Neutral";
  return s;
}

function sentimentGroupLook(sentiment: string) {
  if (sentiment === "positive") {
    return {
      bar: "bg-emerald-500 dark:bg-emerald-400",
      shell:
        "border-emerald-200/90 bg-emerald-50 dark:border-emerald-900/55 dark:bg-emerald-950/35",
      heading: "text-emerald-900 dark:text-emerald-100",
      sub: "text-emerald-700/80 dark:text-emerald-300/90",
      count: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
      rail: "bg-emerald-200/80 dark:bg-emerald-800/60",
      dot: "bg-emerald-500 dark:bg-emerald-400",
      linkHover: "hover:text-emerald-700 dark:hover:text-emerald-300",
    };
  }
  if (sentiment === "negative") {
    return {
      bar: "bg-rose-500 dark:bg-rose-400",
      shell: "border-rose-200/90 bg-rose-50 dark:border-rose-900/55 dark:bg-rose-950/35",
      heading: "text-rose-900 dark:text-rose-100",
      sub: "text-rose-700/80 dark:text-rose-300/90",
      count: "bg-rose-600/15 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
      rail: "bg-rose-200/80 dark:bg-rose-800/60",
      dot: "bg-rose-500 dark:bg-rose-400",
      linkHover: "hover:text-rose-700 dark:hover:text-rose-300",
    };
  }
  if (sentiment === "neutral") {
    return {
      bar: "bg-sky-500 dark:bg-sky-400",
      shell: "border-sky-200/90 bg-sky-50 dark:border-sky-900/55 dark:bg-sky-950/35",
      heading: "text-sky-900 dark:text-sky-100",
      sub: "text-sky-700/80 dark:text-sky-300/90",
      count: "bg-sky-600/15 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100",
      rail: "bg-sky-200/80 dark:bg-sky-800/60",
      dot: "bg-sky-500 dark:bg-sky-400",
      linkHover: "hover:text-sky-800 dark:hover:text-sky-300",
    };
  }
  return {
    bar: "bg-violet-500 dark:bg-violet-400",
    shell: "border-violet-200/90 bg-violet-50 dark:border-violet-900/55 dark:bg-violet-950/35",
    heading: "text-violet-900 dark:text-violet-100",
    sub: "text-violet-700/80 dark:text-violet-300/90",
    count: "bg-violet-600/15 text-violet-900 dark:bg-violet-400/15 dark:text-violet-100",
    rail: "bg-violet-200/80 dark:bg-violet-800/60",
    dot: "bg-violet-500 dark:bg-violet-400",
    linkHover: "hover:text-violet-800 dark:hover:text-violet-300",
  };
}

const navLinkClass =
  "rounded-lg border border-zinc-200/90 bg-zinc-100/80 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100";

export default async function Home() {
  const news = getAllNews();
  const now = new Date();
  const todayKey = cstYmdKey(now);

  const todayNews = news.filter((item) => cstYmdKey(new Date(item.publishAt)) === todayKey);
  const bySentimentGroups = new Map<string, typeof todayNews>();
  for (const item of todayNews) {
    const arr = bySentimentGroups.get(item.sentiment) ?? [];
    arr.push(item);
    bySentimentGroups.set(item.sentiment, arr);
  }
  for (const arr of bySentimentGroups.values()) {
    arr.sort((a, b) => +new Date(b.publishAt) - +new Date(a.publishAt));
  }

  const sentimentSections = [
    ...SENTIMENT_ORDER.filter((s) => (bySentimentGroups.get(s)?.length ?? 0) > 0),
    ...Array.from(bySentimentGroups.keys()).filter((s) => !SENTIMENT_ORDER.includes(s as (typeof SENTIMENT_ORDER)[number])).sort(),
  ];

  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Dlim&apos;s Wonderland</h1>
        <p className="text-base font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
          Hi,there...
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/daily" className={navLinkClass}>
            每日新闻
          </Link>
          <Link href="/weekly" className={navLinkClass}>
            查看周报
          </Link>
          <Link href="/archive" className={navLinkClass}>
            历史归档
          </Link>
          <Link href="/search" className={navLinkClass}>
            站内搜索
          </Link>
          <Link href="/admin" className={navLinkClass}>
            管理后台
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
          <h2 className="text-lg font-semibold">个人日历</h2>
          <p className="mt-1 text-xs text-zinc-500">Personal calendar</p>
          <div className="mt-6 flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm font-medium text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
            即将上线
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
          <h2 className="text-lg font-semibold">今日新闻</h2>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">Today&apos;s News</p>
          <p className="mt-1 text-xs text-zinc-500">
            仅包含新闻源发布时间为今天（{todayKey}，东八区）的条目。
          </p>

          {todayNews.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">今天暂无已发布的新闻。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {sentimentSections.map((sentiment) => {
                const items = bySentimentGroups.get(sentiment) ?? [];
                if (items.length === 0) return null;
                const look = sentimentGroupLook(sentiment);
                return (
                  <div
                    key={sentiment}
                    className={`relative overflow-hidden rounded-xl border pl-3 shadow-sm ${look.shell}`}
                  >
                    <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-xl ${look.bar}`} aria-hidden />
                    <div className="px-3 py-3 pl-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className={`text-sm font-semibold ${look.heading}`}>
                          {sentimentLabelZh(sentiment)}{" "}
                          <span className={`font-normal ${look.sub}`}>/ {sentimentLabelEn(sentiment)}</span>
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${look.count}`}
                        >
                          {items.length} 条
                        </span>
                      </div>
                      <div className="relative mt-3">
                        <div
                          className={`pointer-events-none absolute bottom-1 left-[7px] top-1 w-px ${look.rail}`}
                          aria-hidden
                        />
                        <ul className="space-y-0">
                          {items.map((item, i) => (
                            <li key={item.slug} className="relative flex gap-3 py-2 pl-1">
                              <span
                                className={`relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-white dark:ring-zinc-900/80 ${look.dot}`}
                                aria-hidden
                              />
                              <Link
                                href={`/news/${item.slug}`}
                                className={`min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900 underline-offset-4 transition hover:underline ${look.linkHover} dark:text-zinc-100`}
                              >
                                <span className="tabular-nums text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                                  {(i + 1).toString().padStart(2, "0")}
                                </span>
                                <span className="ml-2">{item.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-10 border-t border-zinc-200/80 pt-6 text-center dark:border-zinc-700/80">
        <p className="font-serif text-sm italic tracking-wide text-zinc-500 dark:text-zinc-400">
          Be honest with yourself！
        </p>
      </footer>
    </main>
  );
}
