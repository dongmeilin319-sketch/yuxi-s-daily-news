"use client";

import { useCallback, useEffect, useState } from "react";
import { buildCstMonthGrid } from "@/lib/cst-calendar";
import { moodEmoji, moodLabel, type MoodId } from "@/lib/home-mood-calendar";
import { DeerDairyPanel } from "@/components/deer-dairy-panel";
import { MoodPickerDialog } from "@/components/mood-picker-dialog";

type MoodRow = {
  dateKey: string;
  moodId: MoodId;
  updatedAt: string;
};

type ScheduleMoodsClientProps = {
  initialYear: number;
  initialMonth: number;
  todayKey: string;
};

function dateInMonth(dateKey: string, y: number, m: number): boolean {
  const prefix = `${y}-${String(m).padStart(2, "0")}-`;
  return dateKey.startsWith(prefix);
}

function formatSelectedDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00+08:00`);
  return d.toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ChevronLeftIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={props.className} width={20} height={20}>
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronRightIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={props.className} width={20} height={20}>
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ScheduleMoodsClient({ initialYear, initialMonth, todayKey }: ScheduleMoodsClientProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [moods, setMoods] = useState<Record<string, MoodId>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<MoodRow[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [bodyDraft, setBodyDraft] = useState("");
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const grid = buildCstMonthGrid(year, month);
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"] as const;

  const load = useCallback(async () => {
    const sess = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()) as {
      user?: unknown;
    };
    const ok = Boolean(sess.user);
    setLoggedIn(ok);
    if (!ok) {
      setMoods({});
      setNotes({});
      setRows([]);
      setError(null);
      return;
    }
    const [moodsRes, notesRes] = await Promise.all([
      fetch(`/api/moods?year=${year}&month=${month}`, { cache: "no-store" }),
      fetch(`/api/schedule-notes?year=${year}&month=${month}`, { cache: "no-store" }),
    ]);
    const moodsData = (await moodsRes.json().catch(() => ({}))) as {
      ok?: boolean;
      moods?: Record<string, MoodId>;
      rows?: MoodRow[];
      message?: string;
    };
    const notesData = (await notesRes.json().catch(() => ({}))) as {
      ok?: boolean;
      notes?: Record<string, string>;
      message?: string;
    };

    if (!moodsRes.ok) {
      setMoods({});
      setRows([]);
      setNotes({});
      setError(moodsData.message ?? "心情记录加载失败");
      return;
    }
    setMoods(moodsData.moods ?? {});
    setRows(moodsData.rows ?? []);

    if (!notesRes.ok) {
      setNotes({});
      setError(notesData.message ?? "日程加载失败");
      return;
    }
    setNotes(notesData.notes ?? {});
    setError(null);
  }, [year, month]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!selectedDateKey) return;
    if (!dateInMonth(selectedDateKey, year, month)) {
      setSelectedDateKey(null);
    }
  }, [year, month, selectedDateKey]);

  useEffect(() => {
    if (!selectedDateKey || !loggedIn) {
      setBodyDraft("");
      return;
    }
    setBodyDraft(notes[selectedDateKey] ?? "");
  }, [selectedDateKey, notes, loggedIn]);

  function prevMonth() {
    if (month <= 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month >= 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const persistMood = useCallback(
    async (dateKey: string, mood: MoodId | null) => {
      const r = await fetch("/api/moods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, mood }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok) {
        setError(data.message ?? "保存失败");
        setPickerKey(null);
        return;
      }
      setPickerKey(null);
      void load();
    },
    [load],
  );

  const saveNote = useCallback(async () => {
    if (!selectedDateKey || !loggedIn) return;
    setSavingNote(true);
    setError(null);
    try {
      const r = await fetch("/api/schedule-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateKey, body: bodyDraft }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok) {
        setError(data.message ?? "保存失败");
        return;
      }
      void load();
    } finally {
      setSavingNote(false);
    }
  }, [selectedDateKey, bodyDraft, loggedIn, load]);

  const selectedDayNum =
    selectedDateKey && dateInMonth(selectedDateKey, year, month)
      ? Number(selectedDateKey.slice(-2))
      : null;

  return (
    <div className="space-y-8">
      {!loggedIn ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
          请先登录后查看与编辑日程与心情。
        </p>
      ) : null}
      {error && loggedIn ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <section className="shrink-0 rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/45 lg:w-[min(100%,22rem)]">
          <div className="flex flex-col items-center gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-700/80">
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!loggedIn}
                aria-label="上一月"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0 text-center">
                <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {year}年{month}月
                </div>
                {selectedDayNum != null ? (
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-indigo-600 dark:text-indigo-400">
                    {selectedDayNum}日
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">选择日期</div>
                )}
              </div>
              <button
                type="button"
                onClick={nextMonth}
                disabled={!loggedIn}
                aria-label="下一月"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            {weekdays.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-1">
            {grid.map((dateKey, i) => {
              if (!dateKey) {
                return <div key={`pad-${i}`} className="aspect-square min-h-[2.75rem]" />;
              }
              const dayNum = Number(dateKey.slice(-2));
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const mood = moods[dateKey];
              const hasMood = Boolean(mood);
              const hasNote = Boolean((notes[dateKey] ?? "").trim());
              const disabled = !loggedIn;

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!loggedIn) return;
                    setSelectedDateKey(dateKey);
                  }}
                  className={`relative flex aspect-square min-h-[2.75rem] flex-col items-center justify-center rounded-lg border text-center transition ${
                    disabled
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  } ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-100/90 ring-2 ring-indigo-400/90 dark:border-indigo-400 dark:bg-indigo-950/50 dark:ring-indigo-500/60"
                      : isToday
                        ? "border-indigo-400/80 bg-indigo-50/90 dark:border-indigo-500/70 dark:bg-indigo-950/35"
                        : "border-transparent bg-zinc-50/80 dark:bg-zinc-900/40"
                  }`}
                >
                  {hasNote ? (
                    <span
                      className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                      aria-hidden
                      title="有日程文字"
                    />
                  ) : null}
                  {hasMood ? (
                    <>
                      <span className="text-xl leading-none">{moodEmoji(mood!)}</span>
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
        </section>

        <DeerDairyPanel
          loggedIn={loggedIn}
          selectedDateKey={selectedDateKey}
          selectedDateLabel={selectedDateKey ? formatSelectedDateLabel(selectedDateKey) : null}
          bodyDraft={bodyDraft}
          onBodyChange={setBodyDraft}
          savingNote={savingNote}
          onSaveNote={() => void saveNote()}
          moodForDay={selectedDateKey ? moods[selectedDateKey] : undefined}
          onOpenMoodPicker={() => {
            if (selectedDateKey) setPickerKey(selectedDateKey);
          }}
        />
      </div>

      <section className="rounded-xl border border-zinc-200/90 bg-white/70 p-4 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
        <h3 className="text-base font-semibold">本月心情记录</h3>
        <p className="mt-1 text-xs text-zinc-500">
          含最后更新时间，便于追溯；在右侧 deer-dairy 中选日后可记录或修改心情。
        </p>
        {!loggedIn ? (
          <p className="mt-4 text-sm text-zinc-500">登录后显示列表。</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">本月尚未记录心情。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-4 font-medium">日期</th>
                  <th className="py-2 pr-4 font-medium">心情</th>
                  <th className="py-2 font-medium">最后更新</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.dateKey} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-4 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.dateKey}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="mr-1.5 text-lg" aria-hidden>
                        {moodEmoji(row.moodId)}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-200">{moodLabel(row.moodId)}</span>
                    </td>
                    <td className="py-2 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {new Date(row.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MoodPickerDialog
        dateKey={pickerKey}
        onClose={() => setPickerKey(null)}
        onPick={(dk, mood) => void persistMood(dk, mood)}
      />
    </div>
  );
}
