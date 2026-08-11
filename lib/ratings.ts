import { Rating, type Grade } from "ts-fsrs";
import { toDayKey, dayKeyDiff } from "@/lib/date";

/**
 * 評価ボタンの定義。FSRSの4段階(Again/Hard/Good/Easy)は
 * アルゴリズムの前提なので減らさず、表示だけ日本語にする。
 */
export const RATING_OPTIONS: {
  grade: Grade;
  label: string;
  hint: string;
  /** 通常時の配色 */
  className: string;
  /** 押している最中・押した直後の配色。押した手応えを出すため一段濃くする */
  activeClassName: string;
}[] = [
  {
    grade: Rating.Again,
    label: "できない",
    hint: "解けなかった",
    className: "bg-red-600 hover:bg-red-500 active:bg-red-800",
    activeClassName: "bg-red-800",
  },
  {
    grade: Rating.Hard,
    label: "苦戦",
    hint: "解けたが時間がかかった",
    className: "bg-orange-500 hover:bg-orange-400 active:bg-orange-700",
    activeClassName: "bg-orange-700",
  },
  {
    grade: Rating.Good,
    label: "できた",
    hint: "問題なく解けた",
    className: "bg-green-600 hover:bg-green-500 active:bg-green-800",
    activeClassName: "bg-green-800",
  },
  {
    grade: Rating.Easy,
    label: "簡単",
    hint: "余裕で解けた",
    className: "bg-blue-600 hover:bg-blue-500 active:bg-blue-800",
    activeClassName: "bg-blue-800",
  },
];

/**
 * 評価ボタン共通のスタイル。
 *
 * active:scale-95 で押している間だけ少し縮み、物理ボタンのように沈む。
 * transition を短くしているのは、遅いと押した瞬間の反応が鈍く感じるため。
 * touch-manipulation はスマホでのダブルタップ判定待ちをなくす。
 */
export const RATING_BUTTON_BASE =
  "rounded-md px-2 py-3 text-sm font-medium text-white touch-manipulation " +
  "transition-[transform,background-color] duration-75 active:scale-95 " +
  "disabled:cursor-not-allowed";

/** 履歴表示用: 1〜4 → ラベル */
export const RATING_LABEL: Record<number, string> = Object.fromEntries(
  RATING_OPTIONS.map((o) => [o.grade, o.label]),
);

/** 1〜4 の範囲に収まっていれば Grade として返す */
export function parseGrade(value: unknown): Grade | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 || n === 4 ? (n as Grade) : null;
}

/**
 * 次回復習日までの間隔を「明日」「3日後」のように表現する。
 *
 * 時刻の差ではなくカレンダー上の日数で数える。時刻差で丸めると、
 * 今日22時が期日の項目を朝10時に見たとき「明日」と出てしまう。
 */
export function describeInterval(due: Date, from: Date = new Date()): string {
  const days = dayKeyDiff(toDayKey(from), toDayKey(due));
  if (days < 0) return "期限切れ";
  if (days === 0) return "今日";
  if (days === 1) return "明日";
  return `${days}日後`;
}

/**
 * 期限をどれだけ過ぎたかを「3日遅れ」の形で返す。
 * 期限切れでない場合は null。
 */
export function describeOverdue(due: Date, from: Date = new Date()): string | null {
  const days = dayKeyDiff(toDayKey(due), toDayKey(from));
  return days > 0 ? `${days}日遅れ` : null;
}
