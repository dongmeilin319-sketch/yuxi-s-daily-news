"use client";

import { useState } from "react";
import { DailyNewsDrawer } from "@/components/daily-news-drawer";
import { DailyRatingStars } from "@/components/daily-rating-stars";

export type DailyNewsListRow = {
  slug: string;
  title: string;
  publishAt: string;
  collectedAt?: string;
  sentiment: string;
  track: string;
  impactType: string;
  originalUrl?: string;
};

type DailyNewsListSectionProps = {
  siteUrl: string;
  rows: DailyNewsListRow[];
  slugRatings: Record<string, number>;
  canRate: boolean;
};

export function DailyNewsListSection({ siteUrl, rows, slugRatings, canRate }: DailyNewsListSectionProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-2">
        {rows.map((item) => (
          <article key={item.slug} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {item.track}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {item.impactType}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-5">
                  <button
                    type="button"
                    onClick={() => setOpenSlug(item.slug)}
                    className="w-full text-left hover:underline"
                  >
                    {item.title}
                  </button>
                </h3>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>发布时间：{new Date(item.publishAt).toLocaleString("zh-CN")}</span>
                  <span>
                    采集时间：
                    {new Date(item.collectedAt ?? item.publishAt).toLocaleString("zh-CN")}
                  </span>
                  <span>情绪：{item.sentiment}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                <DailyRatingStars
                  slug={item.slug}
                  initialRating={slugRatings[item.slug] ?? null}
                  canRate={canRate}
                />
                {item.originalUrl ? (
                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    查看新闻源
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <DailyNewsDrawer
        key={openSlug ?? "drawer-closed"}
        slug={openSlug}
        onClose={() => setOpenSlug(null)}
        pageBaseUrl={siteUrl}
        onSelectRelated={setOpenSlug}
      />
    </>
  );
}
