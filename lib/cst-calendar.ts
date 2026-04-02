/** 公历日期的星期（周一=0），与东八区「日历日」一致，不依赖浏览器本地时区。 */
export function cstCalendarWeekdayMon0(year: number, month: number, day: number): number {
  const sun0 = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (sun0 + 6) % 7;
}

export function daysInCstMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 当月日历格：null 为占位，字符串为 yyyy-mm-dd */
export function buildCstMonthGrid(year: number, month: number): (string | null)[] {
  const dim = daysInCstMonth(year, month);
  const leading = cstCalendarWeekdayMon0(year, month, 1);
  const cells: (string | null)[] = [];
  const y = year;
  const m = String(month).padStart(2, "0");
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 1; d <= dim; d += 1) {
    const dd = String(d).padStart(2, "0");
    cells.push(`${y}-${m}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
