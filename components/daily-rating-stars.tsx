"use client";

import { useMemo, useState } from "react";

type DailyRatingStarsProps = {
  slug: string;
  initialRating: number | null;
  canRate: boolean;
};

function clampToHalf(value: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.max(0.5, Math.min(5, rounded));
}

function StarIcon({ fillPercent }: { fillPercent: number }) {
  return (
    <span className="relative inline-block h-4 w-4">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-300 dark:text-zinc-600" fill="currentColor">
        <path d="M12 2l2.88 5.84 6.45.94-4.66 4.54 1.1 6.42L12 16.9l-5.77 3.04 1.1-6.42L2.67 8.78l6.45-.94L12 2z" />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="currentColor">
          <path d="M12 2l2.88 5.84 6.45.94-4.66 4.54 1.1 6.42L12 16.9l-5.77 3.04 1.1-6.42L2.67 8.78l6.45-.94L12 2z" />
        </svg>
      </span>
    </span>
  );
}

export function DailyRatingStars({ slug, initialRating, canRate }: DailyRatingStarsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stars = useMemo(() => {
    const value = rating ?? 0;
    return Array.from({ length: 5 }, (_, i) => {
      const diff = value - i;
      if (diff >= 1) return 100;
      if (diff >= 0.5) return 50;
      return 0;
    });
  }, [rating]);

  async function save(nextRating: number | null) {
    setSaving(true);
    setError(null);
    const prev = rating;
    setRating(nextRating);
    try {
      const resp = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating: nextRating }),
      });
      const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!resp.ok || !data.ok) {
        throw new Error(data.message || "评分保存失败");
      }
    } catch (e) {
      setRating(prev);
      setError(e instanceof Error ? e.message : "评分保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shrink-0 space-y-1 text-right">
      <div className="text-[11px] text-zinc-500">{canRate ? "我的评分" : "登录后评分"}</div>
      <div
        className={`flex items-center justify-end gap-1 ${canRate ? "[&_button]:cursor-pointer" : ""}`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!canRate || saving}
            onClick={(e) => {
              if (!canRate) return;
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              const half = e.clientX - rect.left < rect.width / 2 ? 0.5 : 1;
              const next = clampToHalf(i + half);
              void save(next);
            }}
            className={
              canRate ? "cursor-pointer transition hover:scale-110" : "cursor-not-allowed opacity-60"
            }
            aria-label={`评分第 ${i + 1} 颗星`}
          >
            <StarIcon fillPercent={stars[i]} />
          </button>
        ))}
        <button
          type="button"
          disabled={!canRate || saving || rating === null}
          onClick={() => void save(null)}
          className="ml-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          清空
        </button>
      </div>
      <div className="text-[11px] text-zinc-400">
        {rating === null ? "未评分" : `${rating.toFixed(1)} / 5`}
      </div>
      {error ? <div className="max-w-40 text-[11px] text-rose-500">{error}</div> : null}
    </div>
  );
}
