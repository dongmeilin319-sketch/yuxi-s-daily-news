/** 东八区「日历日」与页面展示用日期（与 content 发布时间口径一致） */
export const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

export function toCstShiftedDate(d: Date): Date {
  return new Date(d.getTime() + CST_OFFSET_MS);
}

export function cstYmdKey(d: Date): string {
  const x = toCstShiftedDate(d);
  const yyyy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function cstCalendarPartsFromDate(d = new Date()) {
  const x = toCstShiftedDate(d);
  return {
    todayKey: cstYmdKey(d),
    year: x.getUTCFullYear(),
    month: x.getUTCMonth() + 1,
  };
}
