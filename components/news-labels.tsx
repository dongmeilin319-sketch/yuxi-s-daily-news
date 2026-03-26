import Link from "next/link";
import type { NewsLabel } from "@/lib/schema";

function pillClassForType(type: string): string {
  // 这里不做复杂调色，只保证“不同类型可区分”。
  switch (type) {
    case "公司":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200";
    case "任务":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "技术":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200";
    case "主题":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export function NewsLabels({
  labels,
  linkable = true,
}: {
  labels: NewsLabel[];
  linkable?: boolean;
}) {
  const byType = new Map<string, Set<string>>();

  for (const label of labels) {
    if (!label?.type || !label?.value) continue;
    const set = byType.get(label.type) ?? new Set<string>();
    set.add(label.value);
    byType.set(label.type, set);
  }

  const groups = Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0], "zh-CN"));

  if (groups.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {groups.map(([type, values]) => (
        <div key={type} className="space-y-1">
          <p className="text-[11px] font-medium text-zinc-500">{type}</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(values).map((value) => {
                const params = new URLSearchParams({ labelType: type, labelValue: value });
                return (
                  <span
                    key={`${type}:${value}`}
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${pillClassForType(type)}`}
                  >
                    {linkable ? (
                      <Link href={`/?${params.toString()}`} className="hover:underline">
                        {value}
                      </Link>
                    ) : (
                      value
                    )}
                  </span>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

