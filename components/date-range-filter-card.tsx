import Link from "next/link";
import type { ReactNode } from "react";

export type DatePresetId = "all" | "today" | "yesterday" | "week";

type DateRangeFilterCardProps = {
  /** GET 表单提交路径，如 /daily、/weekly */
  action: string;
  preset: DatePresetId;
  customDate: string;
  presetHref: (next: DatePresetId) => string;
  clearHref: string;
  /** 随自定义日期表单提交的隐藏字段（如每日新闻的高级筛选） */
  extraFormFields?: ReactNode;
};

const PRESET_OPTIONS: Array<{ id: DatePresetId; label: string }> = [
  { id: "all", label: "全部" },
  { id: "today", label: "今天" },
  { id: "yesterday", label: "昨天" },
  { id: "week", label: "近7天" },
];

export function DateRangeFilterCard({
  action,
  preset,
  customDate,
  presetHref,
  clearHref,
  extraFormFields,
}: DateRangeFilterCardProps) {
  return (
    <div className="w-full shrink-0 rounded-lg border border-zinc-200 p-3 md:w-fit md:max-w-sm dark:border-zinc-700">
      <h2 className="text-base font-semibold">日期筛选器</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PRESET_OPTIONS.map((opt) => {
          const active = !customDate && preset === opt.id;
          return (
            <Link
              key={opt.id}
              href={presetHref(opt.id)}
              className={
                active
                  ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-full border px-3 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      <form method="get" action={action} className="mt-2 flex flex-wrap items-center gap-2">
        {extraFormFields}
        {preset !== "all" ? <input type="hidden" name="preset" value={preset} /> : null}
        <label htmlFor={`date-${action.replace(/\W/g, "")}`} className="text-xs text-zinc-500">
          自定义日期
        </label>
        <input
          id={`date-${action.replace(/\W/g, "")}`}
          name="date"
          type="date"
          defaultValue={customDate}
          className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-600"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          应用
        </button>
        <Link href={clearHref} className="text-xs underline underline-offset-4">
          清空
        </Link>
      </form>
    </div>
  );
}
