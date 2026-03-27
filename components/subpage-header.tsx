import Link from "next/link";

type SubpageTabKey = "daily" | "weekly" | "schedule" | "notes";

type SubpageHeaderProps = {
  title: string;
  subtitle: string;
  englishSubtitle: string;
  activeTab: SubpageTabKey;
};

const tabs: Array<{ key: SubpageTabKey; label: string; href: string }> = [
  { key: "daily", label: "新闻", href: "/daily" },
  { key: "weekly", label: "周报", href: "/weekly" },
  { key: "schedule", label: "日程", href: "/schedule" },
  { key: "notes", label: "Yuxi随记", href: "/yuxi-notes" },
];

export function SubpageHeader({
  title,
  subtitle,
  englishSubtitle,
  activeTab,
}: SubpageHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                active
                  ? "rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-lg border border-zinc-200/90 bg-zinc-100/80 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {englishSubtitle}
      </p>
    </header>
  );
}
