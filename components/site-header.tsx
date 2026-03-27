"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
type LanguageMode = "zh-CN" | "en-US";

type SearchItem = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  kind: "news" | "weekly" | "archive" | "review";
  date: string;
};

function currentTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const navButtonClass =
  "rounded-md border border-zinc-300/90 bg-white/70 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function SiteHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [lang, setLang] = useState<LanguageMode>("zh-CN");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);

  const safeKeyword = keyword.trim();

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await resp.json()) as { results?: SearchItem[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSettingsOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = currentTheme() === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", next);
    setTheme(next);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  const onSearchSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void runSearch(keyword);
    },
    [keyword, runSearch],
  );

  const themeLabel = useMemo(() => (theme === "dark" ? "深色" : "浅色"), [theme]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/75">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dlim&apos;s Wonderland
          </Link>

          <nav className="relative flex flex-wrap items-center gap-1.5">
            <Link href="/" className={navButtonClass}>
              首页
            </Link>
            <button type="button" onClick={openSearch} className={navButtonClass}>
              搜索
            </button>
            <Link href="/admin" className={navButtonClass}>
              管理后台
            </Link>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen((v) => !v);
                setSearchOpen(false);
              }}
              className={navButtonClass}
            >
              设置
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginOpen(true);
                setSettingsOpen(false);
                setSearchOpen(false);
              }}
              className={navButtonClass}
            >
              登录
            </button>

            {settingsOpen ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs font-semibold text-zinc-500">设置</p>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">主题</span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      切换为{themeLabel}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">语言</span>
                    <select
                      className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-600"
                      value={lang}
                      onChange={(e) => setLang(e.target.value as LanguageMode)}
                    >
                      <option value="zh-CN">中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-zinc-400">语言切换先做 UI，占位不生效。</p>
                </div>
              </div>
            ) : null}
          </nav>
        </div>

        {searchOpen ? (
          <div className="border-t border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/85 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <form onSubmit={onSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索新闻、周报、归档，例如：Anthropic / AI法案"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  搜索
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setKeyword("");
                    setResults([]);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  关闭
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
                          onClick={() => setSearchOpen(false)}
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
        ) : null}
      </header>

      {loginOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">账号登录</h2>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="rounded-md border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                关闭
              </button>
            </div>
            <form className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">账号</label>
                <input
                  type="text"
                  placeholder="请输入账号"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">密码</label>
                <input
                  type="password"
                  placeholder="请输入密码"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                登录（样式占位）
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
