import Link from "next/link";
import { getDueItems } from "@/lib/queries";
import { ReviewButtons } from "@/app/reviews/ReviewButtons";

export default async function DashboardPage() {
  const dueItems = await getDueItems();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        今日の復習
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {dueItems.length} 件の項目が復習期日を迎えています
      </p>

      {dueItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          今日復習すべき項目はありません。
          <Link href="/items" className="ml-1 underline">
            項目を登録する
          </Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {dueItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <Link
                  href={`/items/${item.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {item.title}
                </Link>
                {item.tag && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.tag}
                  </span>
                )}
              </div>
              <ReviewButtons itemId={item.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
