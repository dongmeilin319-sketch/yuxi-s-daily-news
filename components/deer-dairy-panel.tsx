"use client";

import { moodEmoji, moodLabel, type MoodId } from "@/lib/home-mood-calendar";

type DeerDairyPanelProps = {
  loggedIn: boolean;
  selectedDateKey: string | null;
  /** 已本地化的日期长文案，如「2026年3月29日星期日」 */
  selectedDateLabel: string | null;
  bodyDraft: string;
  onBodyChange: (value: string) => void;
  savingNote: boolean;
  onSaveNote: () => void;
  moodForDay: MoodId | undefined;
  onOpenMoodPicker: () => void;
};

export function DeerDairyPanel({
  loggedIn,
  selectedDateKey,
  selectedDateLabel,
  bodyDraft,
  onBodyChange,
  savingNote,
  onSaveNote,
  moodForDay,
  onOpenMoodPicker,
}: DeerDairyPanelProps) {
  return (
    <section
      className="deer-dairy-panel min-w-0 flex-1 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/95 via-orange-50/40 to-rose-50/50 p-1 shadow-md dark:border-amber-900/40 dark:from-amber-950/50 dark:via-zinc-900/80 dark:to-rose-950/30"
      aria-labelledby="deer-dairy-title"
    >
      <div className="rounded-[0.875rem] border border-amber-100/80 bg-[#fffdf8]/90 px-4 py-4 dark:border-amber-900/30 dark:bg-zinc-950/60 sm:px-5 sm:py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-200/60 pb-3 dark:border-amber-900/40">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-500/90">
              deer-dairy
            </p>
            <h2 id="deer-dairy-title" className="mt-0.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-amber-950 dark:text-amber-100">
              <span className="text-2xl leading-none" aria-hidden>
                🦌
              </span>
              小鹿手记
            </h2>
          </div>
        </div>

        {!loggedIn ? (
          <p className="text-sm text-amber-900/70 dark:text-amber-200/80">登录后可编辑 deer-dairy 手记与心情。</p>
        ) : !selectedDateKey || !selectedDateLabel ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-amber-200/80 bg-amber-50/30 px-4 py-8 text-center dark:border-amber-800/50 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-950/90 dark:text-amber-100">在左侧选一天</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-amber-900/65 dark:text-amber-200/70">
              打开 deer-dairy，写下这一天的待办、碎碎念与备忘。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <header>
              <h3 className="text-base font-semibold text-amber-950 dark:text-amber-50">{selectedDateLabel}</h3>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-amber-800/60 dark:text-amber-300/55">
                {selectedDateKey}
              </p>
            </header>

            <div>
              <label htmlFor="deer-dairy-body" className="text-sm font-medium text-amber-950/90 dark:text-amber-100/90">
                今日一页
              </label>
              <textarea
                id="deer-dairy-body"
                value={bodyDraft}
                onChange={(e) => onBodyChange(e.target.value)}
                rows={10}
                placeholder="写在这里… 会议、待办、一句心情都可以。留空保存会清空该日手记。"
                className="mt-2 w-full resize-y rounded-xl border border-amber-200/90 bg-[#fffef9] px-3 py-2.5 text-sm leading-relaxed text-amber-950 shadow-inner placeholder:text-amber-800/35 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300/40 dark:border-amber-900/50 dark:bg-zinc-950/70 dark:text-amber-50 dark:placeholder:text-amber-400/35"
                style={{
                  backgroundImage:
                    "linear-gradient(transparent 1.45rem, rgba(180, 83, 9, 0.08) 1.46rem)",
                  backgroundSize: "100% 1.5rem",
                  lineHeight: "1.5rem",
                }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSaveNote()}
                  disabled={savingNote}
                  className="rounded-xl bg-gradient-to-r from-amber-700 to-rose-700 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm hover:from-amber-800 hover:to-rose-800 disabled:opacity-60 dark:from-amber-600 dark:to-rose-700 dark:hover:from-amber-500 dark:hover:to-rose-600"
                >
                  {savingNote ? "写入中…" : "存入手记"}
                </button>
              </div>
            </div>

            <div className="border-t border-amber-200/70 pt-4 dark:border-amber-900/45">
              <h4 className="text-sm font-medium text-amber-950 dark:text-amber-100">当日心情</h4>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {moodForDay ? (
                  <>
                    <span className="text-2xl" aria-hidden>
                      {moodEmoji(moodForDay)}
                    </span>
                    <span className="text-sm text-amber-950/85 dark:text-amber-100/90">{moodLabel(moodForDay)}</span>
                  </>
                ) : (
                  <span className="text-sm text-amber-800/55 dark:text-amber-300/50">这一天还没有心情印记</span>
                )}
                <button
                  type="button"
                  onClick={onOpenMoodPicker}
                  className="rounded-lg border border-amber-300/90 bg-white/60 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900/60 dark:text-amber-100 dark:hover:bg-amber-950/50"
                >
                  {moodForDay ? "更改心情" : "记录心情"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
