import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemDetail } from "@/lib/queries";
import { updateItem, resumeItem } from "@/app/items/actions";
import { ReviewButtons } from "@/app/reviews/ReviewButtons";
import { RATING_LABEL, describeInterval } from "@/lib/ratings";
import { toDayKey } from "@/lib/date";

const STATE_LABEL: Record<number, string> = {
  0: "未学習",
  1: "学習中",
  2: "復習",
  3: "再学習",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP");
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { item, logs } = await getItemDetail(id);

  if (!item) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/"
        className="mb-3 inline-block text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← ホームに戻る
      </Link>

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          この項目を編集
        </h2>
        <form action={updateItem.bind(null, item.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              タイトル
            </label>
            <input
              name="title"
              defaultValue={item.title}
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="sm:w-32">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              科目
            </label>
            <input
              name="tag"
              defaultValue={item.tag ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {item.review_states && (
            <div className="sm:w-40">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                次回復習日
              </label>
              <input
                type="date"
                name="due"
                defaultValue={toDayKey(new Date(item.review_states.due))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            保存
          </button>
        </form>
      </div>

      {item.review_states && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-zinc-600 sm:grid-cols-4 dark:text-zinc-400">
            <div>
              <div className="text-xs text-zinc-400">状態</div>
              {STATE_LABEL[item.review_states.state]}
            </div>
            <div>
              <div className="text-xs text-zinc-400">次回復習</div>
              {describeInterval(new Date(item.review_states.due))}
            </div>
            <div>
              <div className="text-xs text-zinc-400">安定度</div>
              {item.review_states.stability.toFixed(2)}
            </div>
            <div>
              <div className="text-xs text-zinc-400">難易度</div>
              {item.review_states.difficulty.toFixed(2)}
            </div>
          </div>
          {item.is_archived ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                この項目は停止中です。復習には出てきません。
              </p>
              <form action={resumeItem.bind(null, item.id)} className="mt-2">
                <button
                  type="submit"
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                >
                  復習を再開する
                </button>
              </form>
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                今すぐ復習を記録する
              </p>
              <ReviewButtons itemId={item.id} />
            </>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        復習履歴
      </h2>
      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">まだ復習履歴がありません。</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="text-zinc-500 dark:text-zinc-400">{formatDateTime(log.reviewed_at)}</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {RATING_LABEL[log.rating]}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">次回まで {log.scheduled_days} 日</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
