"use client";

import { useCallback, useEffect, useState } from "react";
import { buildCstMonthGrid } from "@/lib/cst-calendar";
import { moodEmoji, type MoodId } from "@/lib/home-mood-calendar";
import { MoodPickerDialog } from "@/components/mood-picker-dialog";

type HomePersonalCalendarProps = {
  year: number;
  month: number;
  todayKey: string;
};

export function HomePersonalCalendar({ year, month, todayKey }: HomePersonalCalendarProps) {
  const [moods, setMoods] = useState<Record<string, MoodId>>({});
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const grid = buildCstMonthGrid(year, month);
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"] as const;

  const loadMoods = useCallback(async () => {
    const sess = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()) as {
      user?: unknown;
    };
    const ok = Boolean(sess.user);
    setLoggedIn(ok);
    if (!ok) {
      setMoods({});
      setLoadError(null);
      return;
    }
    const r = await fetch(`/api/moods?year=${year}&month=${month}`, { cache: "no-store" });
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      moods?: Record<string, MoodId>;
      message?: string;
    };
    if (!r.ok) {
      setMoods({});
      setLoadError(data.message ?? "加载失败");
      return;
    }
    setMoods(data.moods ?? {});
    setLoadError(null);
  }, [year, month]);

  useEffect(() => {
    queueMicrotask(() => void loadMoods());
  }, [loadMoods]);

  const persistMood = useCallback(
    async (dateKey: string, mood: MoodId | null) => {
      const r = await fetch("/api/moods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, mood }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok) {
        setLoadError(data.message ?? "保存失败");
        setPickerKey(null);
        return;
      }
      setPickerKey(null);
      void loadMoods();
    },
    [loadMoods],
  );

  return (
    <div className="relative mt-3">
      {!loggedIn ? (
        <p className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
          登录后可在账号下记录心情，便于在「日程」页追溯。
        </p>
      ) : null}
      {loadError && loggedIn ? (
        <p className="mb-2 text-[11px] text-rose-600 dark:text-rose-400">{loadError}</p>
      ) : null}

      <p className="mb-2 text-center text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {year} 年 {month} 月
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-1">
        {grid.map((dateKey, i) => {
          if (!dateKey) {
            return <div key={`pad-${i}`} className="aspect-square min-h-[2.5rem]" />;
          }
          const dayNum = Number(dateKey.slice(-2));
          const isToday = dateKey === todayKey;
          const mood = moods[dateKey];
          const hasMood = Boolean(mood);
          const disabled = !loggedIn;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!loggedIn) return;
                setPickerKey(dateKey);
              }}
              className={`flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-lg border text-center transition ${
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              } ${
                isToday
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400/80 dark:border-indigo-400 dark:bg-indigo-950/40 dark:ring-indigo-500/50"
                  : "border-transparent bg-zinc-50/80 dark:bg-zinc-900/40"
              }`}
              aria-label={`${dateKey}，${hasMood ? `心情 ${moodEmoji(mood!)}` : "未记录心情"}${loggedIn ? "，点击选择心情" : ""}`}
            >
              {hasMood ? (
                <>
                  <span className="text-lg leading-none" aria-hidden>
                    {moodEmoji(mood!)}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                    {dayNum}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                  {dayNum}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <MoodPickerDialog
        dateKey={pickerKey}
        onClose={() => setPickerKey(null)}
        onPick={(dk, mood) => void persistMood(dk, mood)}
      />
    </div>
  );
}
