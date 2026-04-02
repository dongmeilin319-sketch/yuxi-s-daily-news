"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (documentHeight <= 0) {
        setProgress(0);
        return;
      }
      const value = Math.min(100, Math.max(0, (scrollTop / documentHeight) * 100));
      setProgress(value);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="sticky z-[25] mb-4 h-1 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800" style={{ top: "var(--site-header-sticky-offset)" }}>
      <div className="h-full bg-zinc-900 transition-[width] duration-150 dark:bg-zinc-100" style={{ width: `${progress}%` }} />
    </div>
  );
}
