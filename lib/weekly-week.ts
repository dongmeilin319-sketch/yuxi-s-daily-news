import { toCstShiftedDate } from "@/lib/cst-wall-clock";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 与每日新闻一致：东八区日历周，周一为一周起点（用 UTC 分量表示 CST 日期） */
export function cstWeekStartUtcMsFromDate(d: Date): number {
  const x = toCstShiftedDate(d);
  const baseUtcMs = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const day = x.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return baseUtcMs - daysSinceMonday * DAY_MS;
}

export function cstDayStartUtcMsFromDate(d: Date): number {
  const x = toCstShiftedDate(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

export function cstWeekRangeFromDate(d: Date): { startMs: number; endMs: number } {
  const startMs = cstWeekStartUtcMsFromDate(d);
  return { startMs, endMs: startMs + 7 * DAY_MS };
}

/** 该周一在东八区属于当月的第几个「周一」（用于「x年x月第x周」） */
export function cstMondayOrdinalInMonth(mondayStartMs: number): number {
  const x = toCstShiftedDate(new Date(mondayStartMs));
  const y = x.getUTCFullYear();
  const month = x.getUTCMonth();
  const mondayDay = x.getUTCDate();
  let ord = 0;
  for (let day = 1; day <= mondayDay; day += 1) {
    const t = Date.UTC(y, month, day, 12, 0, 0);
    const sx = toCstShiftedDate(new Date(t));
    if (sx.getUTCDay() === 1) ord += 1;
  }
  return ord;
}

export function formatWeeklyListTitle(mondayStartMs: number): string {
  const x = toCstShiftedDate(new Date(mondayStartMs));
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth() + 1;
  const w = cstMondayOrdinalInMonth(mondayStartMs);
  return `${y}年${m}月第${w}周`;
}

export function formatWeeklyCompactRange(mondayStartMs: number): string {
  const start = yyyymmddFromCstMs(mondayStartMs);
  const end = yyyymmddFromCstMs(mondayStartMs + 6 * DAY_MS);
  return `${start}-${end}`;
}

function yyyymmddFromCstMs(ms: number): string {
  const x = toCstShiftedDate(new Date(ms));
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const d = String(x.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/** 根据 frontmatter `date` 解析周报覆盖的东八区自然周 [startMs, endMs) */
export function weeklyItemWeekRange(dateIso: string): { startMs: number; endMs: number } {
  return cstWeekRangeFromDate(new Date(dateIso));
}
