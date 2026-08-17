/**
 * 日付の「その日」判定は日本時間で固定する。
 *
 * Vercel のサーバーは UTC で動くため、素の getDate() などを使うと
 * 日本時間の 0:00〜9:00 が前日として集計されてしまう。カレンダーや
 * 日別集計はここのヘルパーを通すこと。
 */
export const TIME_ZONE = "Asia/Tokyo";

/**
 * 1日の始まりとみなす時刻(日本時間)。
 *
 * 深夜0時で日付が変わると、23時50分に解き始めて0時を過ぎた分が
 * 翌日の記録になってしまい、連続学習日数も途切れる。午前4時を境目に
 * することで、0〜4時の記録は自動的に前日扱いになる。
 * (Anki も既定で同じ仕組みを使っている)
 */
export const DAY_START_HOUR = 4;

// en-CA は YYYY-MM-DD 形式で返る
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Date を「その日」を表す日本時間基準の "YYYY-MM-DD" に変換する。
 * DAY_START_HOUR ぶん時刻を巻き戻してから日付を取ることで、
 * 深夜の記録が前日に寄る。
 */
export function toDayKey(date: Date): string {
  return dayKeyFormatter.format(new Date(date.getTime() - DAY_START_HOUR * 3600_000));
}

/** 時刻を巻き戻さない、素のカレンダー日付。カレンダー画面の日付表示など用 */
export function toCalendarDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** アプリ上の「今日」の "YYYY-MM-DD"(午前4時までは前日) */
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

/**
 * "YYYY-MM-DD" を、その日に属する Date に変換する(toDayKey の逆変換)。
 *
 * 0時ではなく**正午**を返す。DAY_START_HOUR ぶん巻き戻す仕様のため、
 * 0時はひとつ前の日付キーに属してしまう。
 *
 *   dayKeyToDate("2026-08-25") が 0時なら
 *     → toDayKey は 8/24 と判定し、指定より1日早く出題される
 *   正午なら
 *     → toDayKey("2026-08-25") に戻り、往復して一致する
 *
 * 日本に夏時間は無いので +09:00 固定で問題ない。
 */
export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T12:00:00+09:00`);
}

/**
 * 過去の日付に記録するときの時刻を決める。
 * 今日なら現在時刻をそのまま使い、過去の日付ならその日の正午とする。
 */
export function recordedAtFor(dayKey: string, now: Date = new Date()): Date {
  if (dayKey === toDayKey(now)) return now;
  return dayKeyToDate(dayKey);
}

/** "YYYY-MM-DD" 形式かどうか */
export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 2つの "YYYY-MM-DD" の日数差(to - from)。カレンダー上の日数で数える */
export function dayKeyDiff(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000,
  );
}

/**
 * その項目が「今日やるべき」かどうか。
 *
 * FSRSの due は「登録時刻 + N日」という時刻付きの値なので、22時に
 * 登録すると翌日22時が期日になる。時刻で比較すると、その時刻まで
 * 復習リストに現れない。学習アプリとして期待される挙動は
 * 「その日になったら出る」なので、日本時間のカレンダー日で比較する。
 */
export function isDueBy(due: string | Date, today: string = todayKey()): boolean {
  return toDayKey(typeof due === "string" ? new Date(due) : due) <= today;
}
