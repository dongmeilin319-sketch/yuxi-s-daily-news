"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HeaderSearchOverlay, type SearchItem } from "@/components/header-search-overlay";
import { HeaderSettingsMenu } from "@/components/header-settings-menu";
import { HeaderLoginModal, type SessionUser } from "@/components/header-login-modal";
import { UserAvatar } from "@/components/user-avatar";

type ThemeMode = "light" | "dark";
type LanguageMode = "zh-CN" | "en-US";

function currentTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const navButtonClass =
  "rounded-md border border-zinc-300/90 bg-white/70 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800";

const iconNavButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300/90 bg-white/70 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800";

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SiteHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [lang, setLang] = useState<LanguageMode>("zh-CN");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsWrapRef = useRef<HTMLDivElement | null>(null);
  const headerShellRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = headerShellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--site-header-sticky-offset", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    setUserMenuOpen(false);
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

  useEffect(() => {
    if (!userMenuOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (userMenuRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (settingsWrapRef.current?.contains(target)) return;
      setSettingsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [settingsOpen]);

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
    setUserMenuOpen(false);
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
      <header
        ref={headerShellRef}
        className="sticky top-0 z-30 bg-white dark:bg-zinc-950"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dlim&apos;s Wonderland
          </Link>

          <nav className="relative flex flex-wrap items-center justify-end gap-1.5">
            <Link href="/" className={navButtonClass}>
              首页
            </Link>
            {(sessionUser?.permissions?.includes("admin") || sessionUser?.isSuperAdmin) && (
              <Link href="/admin" className={navButtonClass}>
                管理后台
              </Link>
            )}
            <button
              ref={searchButtonRef}
              type="button"
              onClick={openSearch}
              className={iconNavButtonClass}
              aria-label="搜索"
            >
              <IconSearch />
            </button>
            <div className="relative" ref={settingsWrapRef}>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen((v) => !v);
                  setSearchOpen(false);
                  setUserMenuOpen(false);
                }}
                className={iconNavButtonClass}
                aria-label="设置"
                aria-expanded={settingsOpen}
              >
                <IconSettings />
              </button>
              <HeaderSettingsMenu
                open={settingsOpen}
                themeLabel={themeLabel}
                lang={lang}
                onToggleTheme={toggleTheme}
                onLanguageChange={(value) => setLang(value)}
              />
            </div>

            {sessionLoading ? (
              <span className={`${navButtonClass} cursor-default opacity-60`}>登录</span>
            ) : sessionUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((v) => !v);
                    setSearchOpen(false);
                    setSettingsOpen(false);
                  }}
                  className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                  aria-label="用户菜单"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <UserAvatar username={sessionUser.username} />
                </button>
                {userMenuOpen ? (
                  <div
                    className="absolute right-0 top-full z-40 mt-2 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      onClick={() => void logout()}
                    >
                      退出
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginOpen(true);
                  setSettingsOpen(false);
                  setSearchOpen(false);
                  setUserMenuOpen(false);
                }}
                className={navButtonClass}
              >
                登录
              </button>
            )}
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
