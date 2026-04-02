"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MDXRemote } from "next-mdx-remote";
import type { serialize } from "next-mdx-remote/serialize";
import { AIAbstract, Insight } from "@/components/mdx-blocks";
import { NewsLabels } from "@/components/news-labels";
import { ShareCopyButton } from "@/components/share-copy-button";
import type { NewsLabel } from "@/lib/schema";

type SerializedMdx = Awaited<ReturnType<typeof serialize>>;

type RelatedEntry = { slug: string; title: string; summary: string };

export type DailyNewsDetailPayload = {
  slug: string;
  title: string;
  summary: string;
  publishAt: string;
  collectedAt: string;
  track: string;
  impactType: string;
  sentiment: string;
  confidence: number;
  originalUrl?: string;
  labels: NewsLabel[];
  related: RelatedEntry[];
  mdx: SerializedMdx;
};

type DailyNewsDrawerProps = {
  slug: string | null;
  onClose: () => void;
  pageBaseUrl: string;
  onSelectRelated?: (slug: string) => void;
};

export function DailyNewsDrawer({ slug, onClose, pageBaseUrl, onSelectRelated }: DailyNewsDrawerProps) {
  const [data, setData] = useState<DailyNewsDetailPayload | null>(null);
  const [loading, setLoading] = useState(() => Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const ac = new AbortController();

    void fetch(`/api/daily-news/${encodeURIComponent(slug)}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "未找到该新闻" : "加载失败");
        return r.json() as Promise<DailyNewsDetailPayload>;
      })
      .then((payload) => {
        if (ac.signal.aborted) return;
        setData(payload);
        setError(null);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted || (e instanceof Error && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug, onClose]);

  if (!slug) return null;

  const pageUrl = `${pageBaseUrl}/news/${slug}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="关闭新闻详情"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-drawer-title"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 id="daily-drawer-title" className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            新闻详情
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/news/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
            >
              新标签页打开
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && <p className="text-sm text-zinc-500">加载中…</p>}
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {data && !loading && !error ? (
            <article className="space-y-5">
              <header className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {data.title}
                  </h3>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <ShareCopyButton title={data.title} summary={data.summary} url={pageUrl} />
                    {data.originalUrl ? (
                      <a
                        href={data.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      >
                        查看原文
                      </a>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>发布时间：{new Date(data.publishAt).toLocaleString("zh-CN")}</span>
                  <span>采集时间：{new Date(data.collectedAt).toLocaleString("zh-CN")}</span>
                  <span>赛道：{data.track}</span>
                  <span>影响类型：{data.impactType}</span>
                  <span>情绪：{data.sentiment}</span>
                  <span>置信度：{data.confidence.toFixed(2)}</span>
                </div>
              </header>

              <NewsLabels labels={data.labels} />

              <div className="prose prose-zinc max-w-none dark:prose-invert">
                <MDXRemote
                  {...data.mdx}
                  components={{
                    AIAbstract,
                    Insight,
                  }}
                />
              </div>

              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h4 className="text-base font-semibold">相关阅读</h4>
                <div className="mt-3 space-y-3">
                  {data.related.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">暂无相关推荐。</p>
                  ) : (
                    data.related.map((entry) => (
                      <article key={entry.slug}>
                        <h5 className="font-medium">
                          {onSelectRelated ? (
                            <button
                              type="button"
                              onClick={() => onSelectRelated(entry.slug)}
                              className="text-left hover:underline"
                            >
                              {entry.title}
                            </button>
                          ) : (
                            <span>{entry.title}</span>
                          )}
                        </h5>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{entry.summary}</p>
                        <Link
                          href={`/news/${entry.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          新标签页打开全文
                        </Link>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </article>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
