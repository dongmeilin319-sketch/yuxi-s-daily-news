"use client";

import { useState } from "react";

type ShareCopyButtonProps = {
  title: string;
  summary: string;
  url: string;
};

function buildShareText(title: string, summary: string, url: string) {
  return `【${title}】\n\n${summary}\n\n阅读原文：${url}`;
}

export function ShareCopyButton({ title, summary, url }: ShareCopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    const text = buildShareText(title, summary, url);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const label =
    state === "copied" ? "已复制" : state === "error" ? "复制失败" : "复制分享文案";

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
    >
      {label}
    </button>
  );
}
