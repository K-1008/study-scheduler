import Link from "next/link";
import { getActiveItems, getTags } from "@/lib/queries";
import { TagFilter } from "@/app/TagFilter";
import { createItem, archiveItem } from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP");
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [allItems, tags] = await Promise.all([getActiveItems(), getTags()]);
  const items = tag ? allItems.filter((i) => i.tag === tag) : allItems;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        演習項目の管理
      </h1>

      <form
        action={createItem}
        className="mb-8 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            タイトル
          </label>
          <input
            name="title"
            required
            placeholder="例: 積分の応用問題 第3章"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:w-40">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            タグ(任意)
          </label>
          <input
            name="tag"
            placeholder="例: 数学"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          登録
        </button>
      </form>

      <TagFilter tags={tags} active={tag} basePath="/items" />

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {tag ? `「${tag}」の項目はありません。` : "まだ項目が登録されていません。"}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/items/${item.id}`}
                  className="truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.tag && <span className="mr-2">{item.tag}</span>}
                  次回復習: {item.review_states ? formatDate(item.review_states.due) : "-"}
                </p>
              </div>
              <form action={archiveItem.bind(null, item.id)}>
                <button
                  type="submit"
                  className="shrink-0 text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  アーカイブ
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
