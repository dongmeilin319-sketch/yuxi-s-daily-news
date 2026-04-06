import Link from "next/link";
import { HomePersonalCalendar } from "@/components/home-personal-calendar";
import { StickyPageHero } from "@/components/sticky-page-hero";
import { getSessionUser } from "@/lib/auth";
import { getAllNews } from "@/lib/content";
import { cstCalendarPartsFromDate, cstYmdKey } from "@/lib/cst-wall-clock";
import { userHasPagePermission } from "@/lib/permissions";

type TrackLook = {
  bar: string;
  shell: string;
  heading: string;
  count: string;
  rail: string;
  dot: string;
  linkHover: string;
};

/** 按赛道名稳定映射配色，与「情绪」语义脱钩 */
const TRACK_PALETTES: TrackLook[] = [
  {
    bar: "bg-indigo-500 dark:bg-indigo-400",
    shell: "border-indigo-200/90 bg-indigo-50 dark:border-indigo-900/55 dark:bg-indigo-950/35",
    heading: "text-indigo-900 dark:text-indigo-100",
    count: "bg-indigo-600/15 text-indigo-900 dark:bg-indigo-400/15 dark:text-indigo-100",
    rail: "bg-indigo-200/80 dark:bg-indigo-800/60",
    dot: "bg-indigo-500 dark:bg-indigo-400",
    linkHover: "hover:text-indigo-800 dark:hover:text-indigo-300",
  },
  {
    bar: "bg-emerald-500 dark:bg-emerald-400",
    shell: "border-emerald-200/90 bg-emerald-50 dark:border-emerald-900/55 dark:bg-emerald-950/35",
    heading: "text-emerald-900 dark:text-emerald-100",
    count: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
    rail: "bg-emerald-200/80 dark:bg-emerald-800/60",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    linkHover: "hover:text-emerald-700 dark:hover:text-emerald-300",
  },
  {
    bar: "bg-sky-500 dark:bg-sky-400",
    shell: "border-sky-200/90 bg-sky-50 dark:border-sky-900/55 dark:bg-sky-950/35",
    heading: "text-sky-900 dark:text-sky-100",
    count: "bg-sky-600/15 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100",
    rail: "bg-sky-200/80 dark:bg-sky-800/60",
    dot: "bg-sky-500 dark:bg-sky-400",
    linkHover: "hover:text-sky-800 dark:hover:text-sky-300",
  },
  {
    bar: "bg-amber-500 dark:bg-amber-400",
    shell: "border-amber-200/90 bg-amber-50 dark:border-amber-900/55 dark:bg-amber-950/35",
    heading: "text-amber-900 dark:text-amber-100",
    count: "bg-amber-600/15 text-amber-900 dark:bg-amber-400/15 dark:text-amber-100",
    rail: "bg-amber-200/80 dark:bg-amber-800/60",
    dot: "bg-amber-500 dark:bg-amber-400",
    linkHover: "hover:text-amber-900 dark:hover:text-amber-200",
  },
  {
    bar: "bg-violet-500 dark:bg-violet-400",
    shell: "border-violet-200/90 bg-violet-50 dark:border-violet-900/55 dark:bg-violet-950/35",
    heading: "text-violet-900 dark:text-violet-100",
    count: "bg-violet-600/15 text-violet-900 dark:bg-violet-400/15 dark:text-violet-100",
    rail: "bg-violet-200/80 dark:bg-violet-800/60",
    dot: "bg-violet-500 dark:bg-violet-400",
    linkHover: "hover:text-violet-800 dark:hover:text-violet-300",
  },
  {
    bar: "bg-rose-500 dark:bg-rose-400",
    shell: "border-rose-200/90 bg-rose-50 dark:border-rose-900/55 dark:bg-rose-950/35",
    heading: "text-rose-900 dark:text-rose-100",
    count: "bg-rose-600/15 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
    rail: "bg-rose-200/80 dark:bg-rose-800/60",
    dot: "bg-rose-500 dark:bg-rose-400",
    linkHover: "hover:text-rose-700 dark:hover:text-rose-300",
  },
];

function trackPaletteIndex(track: string): number {
  let h = 0;
  for (let i = 0; i < track.length; i += 1) {
    h = (h * 31 + track.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % TRACK_PALETTES.length;
}

function trackGroupLook(track: string): TrackLook {
  return TRACK_PALETTES[trackPaletteIndex(track)]!;
}

const navLinkClass =
  "rounded-lg border border-zinc-200/90 bg-zinc-100/80 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const su = sessionUser?.username;
  const perm = sessionUser?.permissions;

  const news = getAllNews();
  const now = new Date();
  const todayKey = cstYmdKey(now);
  const { year: calendarYear, month: calendarMonth } = cstCalendarPartsFromDate(now);

  const todayNews = news.filter((item) => cstYmdKey(new Date(item.publishAt)) === todayKey);
  const byTrackGroups = new Map<string, typeof todayNews>();
  for (const item of todayNews) {
    const key = item.track.trim() || "未分类";
    const arr = byTrackGroups.get(key) ?? [];
    arr.push(item);
    byTrackGroups.set(key, arr);
  }
  for (const arr of byTrackGroups.values()) {
    arr.sort((a, b) => +new Date(b.publishAt) - +new Date(a.publishAt));
  }

  const trackSections = Array.from(byTrackGroups.keys()).sort((a, b) => {
    const ca = byTrackGroups.get(a)?.length ?? 0;
    const cb = byTrackGroups.get(b)?.length ?? 0;
    if (cb !== ca) return cb - ca;
    return a.localeCompare(b, "zh-CN");
  });

  const showSchedule = Boolean(su && userHasPagePermission(su, perm, "schedule"));
  const newsSectionClass =
    "rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/45" +
    (showSchedule ? "" : " md:col-span-2");

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <StickyPageHero className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Dlim&apos;s Wonderland</h1>
        <p className="text-base font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
          Hi,there...
        </p>
        <div className="flex flex-wrap gap-2">
          {su && userHasPagePermission(su, perm, "daily") ? (
            <Link href="/daily" className={navLinkClass}>
              新闻
            </Link>
          ) : null}
          {su && userHasPagePermission(su, perm, "weekly") ? (
            <Link href="/weekly" className={navLinkClass}>
              周报
            </Link>
          ) : null}
          {su && userHasPagePermission(su, perm, "schedule") ? (
            <Link href="/schedule" className={navLinkClass}>
              日程
            </Link>
          ) : null}
          {su && userHasPagePermission(su, perm, "yuxi_notes") ? (
            <Link href="/yuxi-notes" className={navLinkClass}>
              Yuxi随记
            </Link>
          ) : null}
        </div>
      </StickyPageHero>

      <div className="grid gap-4 md:grid-cols-2">
        {showSchedule ? (
          <section className="rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
            <h2 className="text-lg font-semibold">个人日历</h2>
            <p className="mt-1 text-xs text-zinc-500">Personal calendar</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
              当月简图（东八区）。点击日期记录心情，数据仅保存在当前账号下，与他人隔离；详情可在「日程」页查看。
            </p>
            <HomePersonalCalendar year={calendarYear} month={calendarMonth} todayKey={todayKey} />
          </section>
        ) : null}

        <section className={newsSectionClass}>
          <h2 className="text-lg font-semibold">今日新闻</h2>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">Today&apos;s News</p>
          <p className="mt-1 text-xs text-zinc-500">
            仅包含发布时间为今天（{todayKey}，东八区）的条目，按赛道分组展示。
          </p>

          {todayNews.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">今天暂无已发布的新闻。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {trackSections.map((track) => {
                const items = byTrackGroups.get(track) ?? [];
                if (items.length === 0) return null;
                const look = trackGroupLook(track);
                return (
                  <div
                    key={track}
                    className={`relative overflow-hidden rounded-xl border pl-3 shadow-sm ${look.shell}`}
                  >
                    <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-xl ${look.bar}`} aria-hidden />
                    <div className="px-3 py-3 pl-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className={`text-sm font-semibold ${look.heading}`}>{track}</h3>
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
