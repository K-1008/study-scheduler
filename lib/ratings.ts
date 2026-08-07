import { Rating, type Grade } from "ts-fsrs";

/**
 * 評価ボタンの定義。FSRSの4段階(Again/Hard/Good/Easy)は
 * アルゴリズムの前提なので減らさず、表示だけ日本語にする。
 */
export const RATING_OPTIONS: {
  grade: Grade;
  label: string;
  hint: string;
  className: string;
}[] = [
  {
    grade: Rating.Again,
    label: "できない",
    hint: "解けなかった",
    className: "bg-red-600 hover:bg-red-500",
  },
  {
    grade: Rating.Hard,
    label: "苦戦",
    hint: "解けたが時間がかかった",
    className: "bg-orange-500 hover:bg-orange-400",
  },
  {
    grade: Rating.Good,
    label: "できた",
    hint: "問題なく解けた",
    className: "bg-green-600 hover:bg-green-500",
  },
  {
    grade: Rating.Easy,
    label: "簡単",
    hint: "余裕で解けた",
    className: "bg-blue-600 hover:bg-blue-500",
  },
];

/** 履歴表示用: 1〜4 → ラベル */
export const RATING_LABEL: Record<number, string> = Object.fromEntries(
  RATING_OPTIONS.map((o) => [o.grade, o.label]),
);

/** 1〜4 の範囲に収まっていれば Grade として返す */
export function parseGrade(value: unknown): Grade | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 || n === 4 ? (n as Grade) : null;
}

/** 次回復習日までの間隔を「明日」「3日後」のように表現する */
export function describeInterval(due: Date, from: Date = new Date()): string {
  const days = Math.round((due.getTime() - from.getTime()) / 86400000);
  if (days <= 0) return "今日中";
  if (days === 1) return "明日";
  return `${days}日後`;
}
