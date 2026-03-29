"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeaderSearchOverlay, type SearchItem } from "@/components/header-search-overlay";
import { HeaderSettingsMenu } from "@/components/header-settings-menu";
import { HeaderLoginModal, type SessionUser } from "@/components/header-login-modal";

type ThemeMode = "light" | "dark";
type LanguageMode = "zh-CN" | "en-US";

function currentTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const navButtonClass =
  "rounded-md border border-zinc-300/90 bg-white/70 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function SiteHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [lang, setLang] = useState<LanguageMode>("zh-CN");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  const refreshSession = useCallback(() => {
    setSessionLoading(true);
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { user?: SessionUser | null }) => {
        setSessionUser(data.user ?? null);
      })
      .catch(() => setSessionUser(null))
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setSessionUser(null);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const clickInsidePanel = searchPanelRef.current?.contains(target);
      const clickOnSearchButton = searchButtonRef.current?.contains(target);
      if (!clickInsidePanel && !clickOnSearchButton) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [searchOpen]);

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
            <button
              ref={searchButtonRef}
              type="button"
              onClick={openSearch}
              className={navButtonClass}
            >
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
            {sessionLoading ? (
              <span className={`${navButtonClass} cursor-default opacity-60`}>登录</span>
            ) : sessionUser ? (
              <>
                <span className="max-w-[7rem] truncate rounded-md border border-zinc-300/90 bg-white/70 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
                  {sessionUser.username}
                </span>
                <button type="button" onClick={() => void logout()} className={navButtonClass}>
                  退出
                </button>
              </>
            ) : (
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
            )}

            <HeaderSettingsMenu
              open={settingsOpen}
              themeLabel={themeLabel}
              lang={lang}
              onToggleTheme={toggleTheme}
              onLanguageChange={(value) => setLang(value)}
            />
          </nav>
        </div>

        <HeaderSearchOverlay
          open={searchOpen}
          keyword={keyword}
          loading={loading}
          results={results}
          panelRef={searchPanelRef}
          onKeywordChange={setKeyword}
          onSubmit={onSearchSubmit}
          onClose={() => {
            setSearchOpen(false);
            setKeyword("");
            setResults([]);
          }}
          onResultClick={() => setSearchOpen(false)}
        />
      </header>

      <HeaderLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={(user) => setSessionUser(user)}
      />
    </>
  );
}
