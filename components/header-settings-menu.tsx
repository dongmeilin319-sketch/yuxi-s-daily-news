"use client";

type LanguageMode = "zh-CN" | "en-US";

type HeaderSettingsMenuProps = {
  open: boolean;
  themeLabel: string;
  lang: LanguageMode;
  onToggleTheme: () => void;
  onLanguageChange: (value: LanguageMode) => void;
};

export function HeaderSettingsMenu({
  open,
  themeLabel,
  lang,
  onToggleTheme,
  onLanguageChange,
}: HeaderSettingsMenuProps) {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold text-zinc-500">设置</p>
      <div className="mt-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-300">主题</span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            切换为{themeLabel}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-300">语言</span>
          <select
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-600"
            value={lang}
            onChange={(e) => onLanguageChange(e.target.value as LanguageMode)}
          >
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
        <p className="text-[11px] text-zinc-400">语言切换先做 UI，占位不生效。</p>
      </div>
    </div>
  );
}
