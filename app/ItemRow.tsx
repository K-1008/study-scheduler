"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteItem, updateItem } from "@/app/items/actions";
import { describeInterval } from "@/lib/ratings";
import { toDayKey } from "@/lib/date";

export interface ItemRowData {
  id: string;
  title: string;
  tag: string | null;
  due: string;
  reviewCount: number;
}

export function ItemRow({ item, tags }: { item: ItemRowData; tags: string[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSave(formData: FormData) {
    setPending(true);
    try {
      await updateItem(item.id, formData);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const detail =
      item.reviewCount > 0
        ? `\n復習履歴 ${item.reviewCount}件も一緒に消え、元に戻せません。`
        : "\n元に戻せません。";
    if (!window.confirm(`${item.title} を削除しますか?${detail}`)) return;

    setPending(true);
    try {
      await deleteItem(item.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <li className="px-4 py-3">
        <form action={handleSave} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="title"
              defaultValue={item.title}
              required
              aria-label="タイトル"
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="tag"
              defaultValue={item.tag ?? ""}
              list={`tags-${item.id}`}
              placeholder="科目"
              aria-label="科目"
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm sm:w-28 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <datalist id={`tags-${item.id}`}>
              {tags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              次回
              <input
                type="date"
                name="due"
                defaultValue={toDayKey(new Date(item.due))}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/items/${item.id}`}
          className="block truncate text-sm text-zinc-900 hover:underline dark:text-zinc-50"
        >
          {item.title}
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {item.tag && <span className="mr-2">{item.tag}</span>}
          次回 {describeInterval(new Date(item.due))}
        </p>
      </div>

      <div className="flex shrink-0 gap-3 text-xs">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="text-zinc-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
        >
          削除
        </button>
      </div>
    </li>
  );
}
