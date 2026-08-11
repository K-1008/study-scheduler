"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteItem, updateItem, suspendItem, resumeItem } from "@/app/items/actions";
import { describeInterval } from "@/lib/ratings";
import { toDayKey } from "@/lib/date";

export interface ItemRowData {
  id: string;
  title: string;
  tag: string | null;
  due: string;
  reviewCount: number;
}

export function ItemRow({
  item,
  tags,
  suspended = false,
}: {
  item: ItemRowData;
  tags: string[];
  /** 停止中の一覧で使う場合。「停止」の代わりに「再開」を出す */
  suspended?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  /** Server Action を実行して一覧を作り直す。実行中は操作を止める */
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    try {
      await action();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSave(formData: FormData) {
    await run(async () => {
      await updateItem(item.id, formData);
      setEditing(false);
    });
  }

  async function handleDelete() {
    const detail =
      item.reviewCount > 0
        ? `\n復習履歴 ${item.reviewCount}件も一緒に消え、元に戻せません。`
        : "\n元に戻せません。";
    if (!window.confirm(`${item.title} を削除しますか?${detail}`)) return;
    await run(() => deleteItem(item.id));
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
        {/* 停止も再開も取り消せるので確認ダイアログは出さない */}
        {suspended ? (
          <button
            type="button"
            onClick={() => run(() => resumeItem(item.id))}
            disabled={pending}
            title="復習に戻します。次回復習日は停止前のまま"
            className="font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-200"
          >
            再開
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run(() => suspendItem(item.id))}
            disabled={pending}
            title="復習に出なくなります。履歴は残り、いつでも再開できます"
            className="text-zinc-500 hover:text-amber-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-amber-400"
          >
            停止
          </button>
        )}
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
