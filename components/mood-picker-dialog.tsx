"use client";

import { useEffect, useRef } from "react";
import { MOOD_OPTIONS, type MoodId } from "@/lib/home-mood-calendar";

type MoodPickerDialogProps = {
  dateKey: string | null;
  onClose: () => void;
  onPick: (dateKey: string, mood: MoodId | null) => void;
};

export function MoodPickerDialog({ dateKey, onClose, onPick }: MoodPickerDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dateKey) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [dateKey, onClose]);

  if (!dateKey) return null;
  const dk = dateKey;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mood-picker-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3 id="mood-picker-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          记录心情 · {dk}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">选择当天心情（保存在账号下，可稍后在日程页查看）</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 py-2 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
              onClick={() => onPick(dk, opt.id)}
            >
              <span className="text-2xl" aria-hidden>
                {opt.emoji}
              </span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            className="text-xs text-zinc-500 underline-offset-2 hover:underline"
            onClick={() => onPick(dk, null)}
          >
            清除记录
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
