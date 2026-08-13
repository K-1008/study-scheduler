import { getUserSettingsRow } from "@/lib/settings";
import { getTrainableItemCount, getTags } from "@/lib/queries";
import { buildScheduler, DEFAULT_SETTINGS } from "@/lib/fsrs";
import { MIN_TRAINABLE_ITEMS } from "@/lib/optimizer";
import { createEmptyCard, Rating } from "ts-fsrs";
import {
  saveRetention,
  saveTagRetention,
  runOptimization,
  resetParameters,
  testOptimizer,
} from "./actions";

const CHOICES = [
  { value: 0.85, label: "0.85", note: "復習を減らしたい" },
  { value: 0.9, label: "0.90", note: "標準" },
  { value: 0.95, label: "0.95", note: "取りこぼしを減らしたい" },
];

/**
 * 科目別に選べる値。全体設定より高い値を用意している。
 *
 * 数週間先の試験に向けて詰めたい場合、0.95では効果が小さい。試験まで
 * 23日として復習回数を計算すると 0.90 も 0.95 もどちらも3回で、
 * 差が出るのは 0.97(4回)以上から。0.99 は7回になるが復習量も跳ね上がる。
 */
const TAG_CHOICES = [
  ...CHOICES,
  { value: 0.97, label: "0.97", note: "試験が近い" },
  { value: 0.99, label: "0.99", note: "直前に詰め込む" },
];

/** その保持率で、新規項目に「できた」を押し続けた場合の間隔 */
function previewIntervals(retention: number): number[] {
  const scheduler = buildScheduler({ requestRetention: retention, params: null });
  const t0 = new Date("2026-01-01T00:00:00Z");
  let card = createEmptyCard(t0);
  let t = t0;
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    const { card: next } = scheduler.next(card, t, Rating.Good);
    out.push(Math.round((next.due.getTime() - t.getTime()) / 86400000));
    card = next;
    t = card.due;
  }
  return out;
}

function Notice({ text, tone }: { text: string; tone: "ok" | "error" }) {
  const cls =
    tone === "ok"
      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
      : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200";
  return <p className={`mb-4 rounded-md px-3 py-2 text-sm ${cls}`}>{text}</p>;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const [row, trainable, tags] = await Promise.all([
    getUserSettingsRow(),
    getTrainableItemCount(),
    getTags(),
  ]);

  const current = row?.request_retention ?? DEFAULT_SETTINGS.requestRetention;
  const tagRetention = row?.tag_retention ?? {};
  const ready = trainable >= MIN_TRAINABLE_ITEMS;
  const progress = Math.min(100, Math.round((trainable / MIN_TRAINABLE_ITEMS) * 100));
  const optimized = Boolean(row?.fsrs_params);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">設定</h1>

      {saved && <Notice text={saved} tone="ok" />}
      {error && <Notice text={error} tone="error" />}

      {/* ---------- 目標保持率 ---------- */}
      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">目標保持率</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          復習で出てきたとき、どれくらいの確率で思い出せる状態にしておきたいか。
          上げるほど間隔が短くなり復習量が増えます。
        </p>

        <form action={saveRetention} className="mt-4 space-y-3">
          {CHOICES.map((choice) => {
            const intervals = previewIntervals(choice.value);
            const active = Math.abs(current - choice.value) < 0.001;
            return (
              <label
                key={choice.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                  active
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                }`}
              >
                <input
                  type="radio"
                  name="request_retention"
                  value={choice.value}
                  defaultChecked={active}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {choice.label}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{choice.note}</span>
                    <span className="text-xs text-zinc-400">
                      忘れる想定 約{Math.round((1 - choice.value) * 100)}%
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                    「できた」を続けた場合の間隔: {intervals.join(" → ")} 日
                  </span>
                </span>
              </label>
            );
          })}

          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            保存
          </button>
        </form>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          変更は次回以降の復習から適用されます。既に決まっている次回復習日は変わりません。
        </p>
      </section>

      {/* ---------- 科目ごとの保持率 ---------- */}
      {tags.length > 0 && (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            科目ごとの目標保持率
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            試験が近い科目だけ高くすると、その科目の復習間隔が短くなり優先的に出題されます。
            設定しない科目は上の全体設定に従います。
          </p>
          <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="font-medium">数週間先の試験に向けて詰めるなら 0.97 以上。</span>
            試験まで23日として復習が回る回数を計算すると、0.90 と 0.95 はどちらも3回で差が出ません。
            0.97 で4回、0.99 で7回になります。試験が終わったら戻すか、科目ごと停止してください。
          </p>

          <form action={saveTagRetention} className="mt-4">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {tags.map((t) => (
                <li key={t} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                    {t}
                  </span>
                  <select
                    name={`tag:${t}`}
                    defaultValue={String(tagRetention[t] ?? "")}
                    aria-label={`${t} の目標保持率`}
                    className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">全体設定に従う({current})</option>
                    {TAG_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}({c.note})
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <button
              type="submit"
              className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              保存
            </button>
          </form>
        </section>
      )}

      {/* ---------- 個人最適化 ---------- */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          パラメータの個人最適化
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          FSRSの21個のパラメータを、あなたの復習履歴に合わせて調整します。
          大規模な公開データで学習した既定値を出発点に、そこから離れすぎないよう
          制約をかけながら微調整するので、データが少ないうちは既定値のままに近く、
          増えるほど自分向きに寄っていきます。
        </p>

        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-300">
              学習に使えるデータ {trainable} / {MIN_TRAINABLE_ITEMS} 件
            </span>
            <span className="text-zinc-400">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            同じ項目を2回以上、1日以上あけて復習すると増えます
          </p>
        </div>

        {row?.optimized_at && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
            最終実行: {new Date(row.optimized_at).toLocaleString("ja-JP")}
            {row.optimized_review_count != null && `(${row.optimized_review_count}件で学習)`}
            <br />
            現在 {optimized ? "個人最適化したパラメータ" : "既定のパラメータ"} を使用中
          </p>
        )}

        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {ready
            ? "実行できます。データが増えたら再実行すると精度が上がります(月1回程度が目安)。"
            : `あと ${MIN_TRAINABLE_ITEMS - trainable} 件で実行できます。これを下回るとライブラリ側が学習を省略し、既定値がそのまま返るためです。`}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <form action={runOptimization}>
            <button
              type="submit"
              disabled={!ready}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
            >
              最適化を実行
            </button>
          </form>
          {optimized && (
            <form action={resetParameters}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                既定値に戻す
              </button>
            </form>
          )}
        </div>

        <form action={testOptimizer} className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          <button
            type="submit"
            className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            この環境で最適化が動くか確認する
          </button>
          <p className="mt-1 text-xs text-zinc-400">
            合成データで実行経路だけを試します。あなたのデータも設定も変わりません。
          </p>
        </form>
      </section>
    </main>
  );
}
