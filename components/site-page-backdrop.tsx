/**
 * 全站页面渐变 + 光斑背景（置于 layout，所有子页面与首页共用）。
 */
export function SitePageBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-x-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-violet-50/90 via-white to-indigo-50/70 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950/40" />
      <div className="absolute -left-24 top-[-10%] h-[min(420px,50vh)] w-[min(420px,85vw)] rounded-full bg-fuchsia-200/35 blur-3xl dark:bg-fuchsia-900/20" />
      <div className="absolute -right-20 top-[25%] h-[min(380px,45vh)] w-[min(380px,80vw)] rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/25" />
    </div>
  );
}
