import Link from "next/link";
import { ReviewButtons } from "@/app/reviews/ReviewButtons";

/**
 * 復習1件ぶんのカード。期限切れセクションと今日のセクションで
 * 同じ見た目を使い回すために切り出してある。
 *
 * overdueLabel を渡すと「3日遅れ」のバッジが付く。
 */
export function ReviewCard({
  item,
  overdueLabel,
}: {
  item: { id: string; title: string; tag: string | null };
  overdueLabel?: string | null;
}) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <Link
          href={`/items/${item.id}`}
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
        >
          {item.title}
        </Link>
        <span className="flex shrink-0 items-baseline gap-2">
          {overdueLabel && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {overdueLabel}
            </span>
          )}
          {item.tag && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.tag}
            </span>
          )}
        </span>
      </div>
      <ReviewButtons itemId={item.id} />
    </li>
  );
}
