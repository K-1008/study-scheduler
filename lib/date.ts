/**
 * 日付の「その日」判定は日本時間で固定する。
 *
 * Vercel のサーバーは UTC で動くため、素の getDate() などを使うと
 * 日本時間の 0:00〜9:00 が前日として集計されてしまう。カレンダーや
 * 日別集計はここのヘルパーを通すこと。
 */
export const TIME_ZONE = "Asia/Tokyo";

// en-CA は YYYY-MM-DD 形式で返る
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date を日本時間基準の "YYYY-MM-DD" に変換する */
export function toDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** 日本時間の「今日」の "YYYY-MM-DD" */
export function todayKey(): string {
  return toDayKey(new Date());
}

/** "YYYY-MM-DD" を n 日ずらす */
export function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → 表示用 "8/7" */
export function formatDayKeyShort(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}`;
}
