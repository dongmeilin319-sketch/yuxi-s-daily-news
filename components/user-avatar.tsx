"use client";

type UserAvatarProps = {
  username: string;
  size?: "sm" | "md";
};

/** 昵称首字母圆形头像（ASCII 取首字母大写，中文取第一个字符） */
export function UserAvatar({ username, size = "sm" }: UserAvatarProps) {
  const raw = username.trim();
  let letter = "?";
  if (raw.length > 0) {
    const first = raw.codePointAt(0);
    if (first !== undefined) {
      const ch = String.fromCodePoint(first);
      letter = /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
    }
  }

  const sizeClass = size === "md" ? "h-9 w-9 text-sm" : "h-8 w-8 text-xs";

  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-semibold text-white shadow-sm ring-2 ring-white/30 dark:ring-zinc-800/80`}
      aria-hidden
    >
      {letter}
    </span>
  );
}
