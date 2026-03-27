"use client";

import Link from "next/link";
import { FormEvent } from "react";

export type SearchItem = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  kind: "news" | "weekly" | "archive" | "review";
  date: string;
};

type HeaderSearchOverlayProps = {
  open: boolean;
  keyword: string;
  loading: boolean;
  results: SearchItem[];
  panelRef: React.RefObject<HTMLDivElement | null>;
  onKeywordChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onResultClick: () => void;
};

export function HeaderSearchOverlay({
  open,
  keyword,
  loading,
  results,
  panelRef,
  onKeywordChange,
  onSubmit,
  onClose,
  onResultClick,
}: HeaderSearchOverlayProps) {
  const safeKeyword = keyword.trim();
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="border-t border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/85 sm:px-6"
    >
      <div className="mx-auto w-full max-w-4xl">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索新闻、周报、归档，例如：Anthropic / AI法案"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="执行搜索"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20L16.6 16.6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="关闭搜索"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </form>

        <div className="mt-3 max-h-[44vh] overflow-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          {safeKeyword.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">输入关键词后点击搜索。</p>
          ) : loading ? (
            <p className="p-3 text-xs text-zinc-500">搜索中...</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">暂无匹配结果。</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {results.map((item) => (
                <li key={item.id} className="p-3">
                  <Link
                    href={item.href}
                    onClick={onResultClick}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">{item.excerpt}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {item.kind} · {new Date(item.date).toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
