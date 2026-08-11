"use client";

import { useState } from "react";
import { suspendTag, resumeTag } from "@/app/items/actions";

/**
 * 科目まるごとを停止・再開するボタン。
 *
 * 一度に多くの項目が動くので、件数を示して確認を取る。
 * 実行後はサーバー側が絞り込みを外して / に戻す。
 */
export function TagBulkButton({
  tag,
  count,
  action,
}: {
  tag: string;
  count: number;
  action: "suspend" | "resume";
}) {
  const [pending, setPending] = useState(false);
  const isSuspend = action === "suspend";

  async function handleClick() {
    const message = isSuspend
      ? `「${tag}」の ${count}件 を停止しますか?\n復習に出なくなりますが、履歴は残りいつでも再開できます。`
      : `「${tag}」の ${count}件 を再開しますか?`;
    if (!window.confirm(message)) return;

    setPending(true);
    try {
      await (isSuspend ? suspendTag(tag) : resumeTag(tag));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
        isSuspend
          ? "border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {pending
        ? "処理中…"
        : isSuspend
          ? `この科目をまとめて停止(${count}件)`
          : `「${tag}」をまとめて再開(${count}件)`}
    </button>
  );
}
