import { getUserSettingsRow } from "@/lib/settings";
import { getStats } from "@/lib/queries";
import { buildScheduler, DEFAULT_SETTINGS } from "@/lib/fsrs";
import { createEmptyCard, Rating } from "ts-fsrs";
import { saveRetention } from "./actions";

/** FSRS開発チームが「意味のある最適化」に推奨する復習ログ件数 */
const OPTIMIZE_THRESHOLD = 1000;

const CHOICES = [
  { value: 0.85, label: "0.85", note: "復習を減らしたい" },
  { value: 0.9, label: "0.90", note: "標準" },
  { value: 0.95, label: "0.95", note: "取りこぼしを減らしたい" },
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
  const [row, stats] = await Promise.all([getUserSettingsRow(), getStats()]);

  const current = row?.request_retention ?? DEFAULT_SETTINGS.requestRetention;
  const reviews = stats.totalReviews;
  const progress = Math.min(100, Math.round((reviews / OPTIMIZE_THRESHOLD) * 100));

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

      {/* ---------- 個人最適化 ---------- */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          パラメータの個人最適化
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          FSRSの21個のパラメータを、あなたの復習履歴に合わせて調整します。
          いまは大規模な公開データで学習した既定値を使っています。
        </p>

        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-300">
              復習ログ {reviews} / {OPTIMIZE_THRESHOLD} 件
            </span>
            <span className="text-zinc-400">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
        </div>

        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {reviews >= OPTIMIZE_THRESHOLD
            ? "十分なログが溜まりました。最適化を実行できます。"
            : `データが足りません。この件数で最適化すると、たまたまの結果に引きずられて既定値より精度が落ちます。あと ${OPTIMIZE_THRESHOLD - reviews} 件の復習が必要です。`}
        </p>

        <button
          type="button"
          disabled
          className="mt-3 cursor-not-allowed rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
        >
          最適化を実行(未実装)
        </button>
      </section>
    </main>
  );
}
