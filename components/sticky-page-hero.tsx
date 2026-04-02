import type { ComponentPropsWithoutRef } from "react";

export type StickyPageHeroProps = ComponentPropsWithoutRef<"header"> & {
  /** 在顶栏高度之上再下移，用于新闻页阅读进度条等 */
  stickyTopExtra?: string;
};

const baseHero =
  "sticky z-20 -mx-4 border-b border-zinc-200/80 bg-white px-4 pb-3 pt-3 dark:border-zinc-800/80 dark:bg-zinc-950 sm:-mx-6 sm:px-6";

export function StickyPageHero({
  className = "",
  stickyTopExtra = "0px",
  style,
  ...rest
}: StickyPageHeroProps) {
  return (
    <header
      {...rest}
      style={{
        /* 上移 1px 盖住顶栏与粘性区之间的亚像素缝，避免背后渐变/正文透出 */
        top: `calc(var(--site-header-sticky-offset) + ${stickyTopExtra} - 1px)`,
        ...style,
      }}
      className={`${baseHero} ${className}`.trim()}
    />
  );
}
