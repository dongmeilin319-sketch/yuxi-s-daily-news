"use client";

import { useCallback, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("theme-change", onStoreChange);
  return () => window.removeEventListener("theme-change", onStoreChange);
};

function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: ThemeMode = getSnapshot() === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  const label = mode === "dark" ? "深色" : "浅色";

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label="切换浅色/深色主题"
    >
      {label}
    </button>
  );
}
