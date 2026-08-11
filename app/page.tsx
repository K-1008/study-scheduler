import { getActiveItems, getDueBuckets, getTags } from "@/lib/queries";
import { TagFilter } from "@/app/TagFilter";
import { AddSolvedForm } from "@/app/AddSolvedForm";
import { ItemRow } from "@/app/ItemRow";
import { ReviewCard } from "@/app/ReviewCard";
import { reviewCountOf } from "@/lib/types";
import { describeOverdue } from "@/lib/ratings";

/** 期限切れが溜まっても圧迫感が出ないよう、最初はこの件数だけ見せる */
const OVERDUE_PREVIEW = 5;

function Notice({ text, tone }: { text: string; tone: "ok" | "error" }) {
  const cls =
    tone === "ok"
      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
      : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200";
  return <p className={`mb-4 rounded-md px-3 py-2 text-sm ${cls}`}>{text}</p>;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; added?: string; error?: string }>;
}) {
  const { tag, added, error } = await searchParams;
  const [due, allItems, tags] = await Promise.all([
    getDueBuckets(tag),
    getActiveItems(),
    getTags(),
  ]);

  const overduePreview = due.overdue.slice(0, OVERDUE_PREVIEW);
  const overdueRest = due.overdue.slice(OVERDUE_PREVIEW);

  const scheduled = allItems
    .filter((i) => !tag || i.tag === tag)
    .filter((i) => i.review_states)
    .sort(
      (a, b) =>
        new Date(a.review_states!.due).getTime() - new Date(b.review_states!.due).getTime(),
    );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {added && <Notice text={added} tone="ok" />}
      {error && <Notice text={error} tone="error" />}

      <AddSolvedForm tags={tags} />

      <TagFilter tags={tags} active={tag} basePath="/" />

      {/* ---------- 期限切れ ---------- */}
      {due.overdue.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            期限切れ
            <span className="text-xs font-normal text-amber-700/80 dark:text-amber-400/80">
              {due.overdue.length} 件
            </span>
          </h2>

          <ul className="space-y-3">
            {overduePreview.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                overdueLabel={describeOverdue(new Date(item.review_states!.due))}
              />
            ))}
          </ul>

          {overdueRest.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-amber-800 hover:underline dark:text-amber-300">
                さらに {overdueRest.length} 件を表示
              </summary>
              <ul className="mt-3 space-y-3">
                {overdueRest.map((item) => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    overdueLabel={describeOverdue(new Date(item.review_states!.due))}
                  />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ---------- 今日の復習 ---------- */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          今日の復習
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {due.today.length} 件
          </span>
        </h2>

        {due.today.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {tag
              ? `「${tag}」で今日が期日の項目はありません。`
              : due.overdue.length > 0
                ? "今日が期日の項目はありません。上の期限切れから片付けましょう。"
                : "今日やるべき復習はありません。おつかれさまです。"}
          </p>
        ) : (
          <ul className="space-y-3">
            {due.today.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      {/* ---------- 登録済みの全項目 ---------- */}
      <details className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900">
          すべての項目
          <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {scheduled.length} 件
          </span>
        </summary>

        {scheduled.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            まだ項目がありません。
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-900 dark:border-zinc-900">
            {scheduled.map((item) => (
              <ItemRow
                key={item.id}
                tags={tags}
                item={{
                  id: item.id,
                  title: item.title,
                  tag: item.tag,
                  due: item.review_states!.due,
                  reviewCount: reviewCountOf(item),
                }}
              />
            ))}
          </ul>
        )}
      </details>
    </main>
  );
}
