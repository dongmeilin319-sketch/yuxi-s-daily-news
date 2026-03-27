import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dlim&apos;s Wonderland
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              首页
            </Link>
            <Link href="/daily" className="hover:underline">
              每日新闻
            </Link>
            <Link href="/weekly" className="hover:underline">
              周报
            </Link>
            <Link href="/search" className="hover:underline">
              搜索
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
