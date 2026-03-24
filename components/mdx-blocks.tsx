import type { ReactNode } from "react";

export function AIAbstract({ children }: { children: ReactNode }) {
  return (
    <section className="my-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <h3 className="mb-2 text-base font-semibold text-blue-900 dark:text-blue-200">AI 摘要</h3>
      <div className="text-sm text-zinc-800 dark:text-zinc-200">{children}</div>
    </section>
  );
}

export function Insight({
  title,
  children,
}: {
  title: "短期" | "中期" | "风险" | string;
  children: ReactNode;
}) {
  const styleMap: Record<string, string> = {
    短期: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    中期: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
    风险: "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30",
  };

  return (
    <section className={`my-4 rounded-xl border p-4 ${styleMap[title] ?? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"}`}>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <div className="text-sm text-zinc-800 dark:text-zinc-200">{children}</div>
    </section>
  );
}
