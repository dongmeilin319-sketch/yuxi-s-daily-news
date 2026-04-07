"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCstMonthGrid } from "@/lib/cst-calendar";
import { MOOD_OPTIONS, moodEmoji, moodLabel, type MoodId } from "@/lib/home-mood-calendar";
import { DeerDairyPanel } from "@/components/deer-dairy-panel";
import { MoodPickerDialog } from "@/components/mood-picker-dialog";

type MoodRow = {
  dateKey: string;
  moodId: MoodId;
  updatedAt: string;
};

const MOOD_AXIS: MoodId[] = ["sad", "nervous", "calm", "happy", "blessed"];
const MOOD_Y_INDEX = new Map<MoodId, number>(MOOD_AXIS.map((id, i) => [id, i]));

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

function parseDateKeyToCstDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00+08:00`);
}

function formatDateKey(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysFromDateKey(dateKey: string, delta: number): string {
  const d = parseDateKeyToCstDate(dateKey);
  d.setUTCDate(d.getUTCDate() + delta);
  return formatDateKey(d);
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
  const [recentRows, setRecentRows] = useState<Record<string, MoodRow>>({});
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [bodyDraft, setBodyDraft] = useState("");
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const grid = buildCstMonthGrid(year, month);
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"] as const;
  const recent30DateKeys = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDaysFromDateKey(todayKey, i - 29)),
    [todayKey],
  );
  const recent30MonthPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const dk of recent30DateKeys) pairs.add(dk.slice(0, 7));
    return Array.from(pairs).map((x) => {
      const [yy, mm] = x.split("-");
      return { year: Number.parseInt(yy ?? "0", 10), month: Number.parseInt(mm ?? "0", 10) };
    });
  }, [recent30DateKeys]);

  const load = useCallback(async () => {
    const sess = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()) as {
      user?: unknown;
    };
    const ok = Boolean(sess.user);
    setLoggedIn(ok);
    if (!ok) {
      setMoods({});
      setNotes({});
      setRecentRows({});
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
      setNotes({});
      setError(moodsData.message ?? "心情记录加载失败");
      return;
    }
    setMoods(moodsData.moods ?? {});

    if (!notesRes.ok) {
      setNotes({});
      setError(notesData.message ?? "日程加载失败");
      return;
    }
    setNotes(notesData.notes ?? {});
    setError(null);

    const chartRowsMap: Record<string, MoodRow> = {};
    for (const pair of recent30MonthPairs) {
      const chartRes = await fetch(`/api/moods?year=${pair.year}&month=${pair.month}`, {
        cache: "no-store",
      });
      if (!chartRes.ok) continue;
      const chartData = (await chartRes.json().catch(() => ({}))) as { rows?: MoodRow[] };
      for (const row of chartData.rows ?? []) {
        if (!recent30DateKeys.includes(row.dateKey)) continue;
        const prev = chartRowsMap[row.dateKey];
        if (!prev || Date.parse(row.updatedAt) > Date.parse(prev.updatedAt)) {
          chartRowsMap[row.dateKey] = row;
        }
      }
    }
    setRecentRows(chartRowsMap);
  }, [year, month, recent30DateKeys, recent30MonthPairs]);

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

  const chartPoints = useMemo(
    () =>
      recent30DateKeys
        .map((dateKey, index) => {
          const row = recentRows[dateKey];
          if (!row) return null;
          const moodIndex = MOOD_Y_INDEX.get(row.moodId);
          if (moodIndex == null) return null;
          return { dateKey, moodId: row.moodId, index, moodIndex };
        })
        .filter((x): x is { dateKey: string; moodId: MoodId; index: number; moodIndex: number } => x != null),
    [recent30DateKeys, recentRows],
  );

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
          以近30天为默认窗口：横轴为日期，纵轴为心情（从难过到幸福）。
        </p>
        {!loggedIn ? (
          <p className="mt-4 text-sm text-zinc-500">登录后显示可视化。</p>
        ) : chartPoints.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">近30天尚未记录心情。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox="0 0 860 300"
              className="h-[300px] min-w-[860px] w-full rounded-lg border border-zinc-200/90 bg-white/90 p-2 dark:border-zinc-700/90 dark:bg-zinc-900/60"
              role="img"
              aria-label="近30天心情坐标图"
            >
              <line x1="60" y1="24" x2="60" y2="260" stroke="currentColor" opacity="0.35" />
              <line x1="60" y1="260" x2="830" y2="260" stroke="currentColor" opacity="0.35" />

              {MOOD_AXIS.map((id, moodIdx) => {
                const y = 260 - (moodIdx / (MOOD_AXIS.length - 1)) * 220;
                return (
                  <g key={id}>
                    <line x1="60" y1={y} x2="830" y2={y} stroke="currentColor" opacity="0.12" />
                    <text x="8" y={y + 4} fontSize="12" fill="currentColor" opacity="0.8">
                      {moodEmoji(id)} {moodLabel(id)}
                    </text>
                  </g>
                );
              })}

              {recent30DateKeys.map((dateKey, index) => {
                if (index % 5 !== 0 && index !== recent30DateKeys.length - 1) return null;
                const x = 60 + (index / (recent30DateKeys.length - 1)) * 770;
                return (
                  <g key={`x-${dateKey}`}>
                    <line x1={x} y1="260" x2={x} y2="264" stroke="currentColor" opacity="0.5" />
                    <text x={x - 20} y="282" fontSize="10" fill="currentColor" opacity="0.75">
                      {dateKey.slice(5)}
                    </text>
                  </g>
                );
              })}

              {chartPoints.map((p) => {
                const x = 60 + (p.index / (recent30DateKeys.length - 1)) * 770;
                const y = 260 - (p.moodIndex / (MOOD_AXIS.length - 1)) * 220;
                return (
                  <g key={p.dateKey}>
                    <circle cx={x} cy={y} r="6" fill="currentColor" opacity="0.8" />
                    <text x={x - 8} y={y - 10} fontSize="12" fill="currentColor" opacity="0.9">
                      {moodEmoji(p.moodId)}
                    </text>
                    <title>{`${p.dateKey} ${moodLabel(p.moodId)}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        {loggedIn ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {MOOD_OPTIONS.map((m) => (
              <span key={m.id} className="rounded-full border border-zinc-200 px-2 py-0.5 dark:border-zinc-700">
                {m.emoji} {m.label}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <MoodPickerDialog
        dateKey={pickerKey}
        onClose={() => setPickerKey(null)}
        onPick={(dk, mood) => void persistMood(dk, mood)}
      />
    </div>
  );
}
