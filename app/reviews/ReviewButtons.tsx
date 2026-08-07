"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Grade } from "ts-fsrs";
import { RATING_OPTIONS, describeInterval } from "@/lib/ratings";
import { submitReview } from "./actions";

export function ReviewButtons({ itemId }: { itemId: string }) {
  const [pending, setPending] = useState<Grade | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick(grade: Grade) {
    setPending(grade);
    try {
      const result = await submitReview(itemId, grade);
      setDone(describeInterval(new Date(result.nextDue)));
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (done) {
    return (
      <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
        記録しました。次回は{done}です。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {RATING_OPTIONS.map((opt) => (
        <button
          key={opt.grade}
          type="button"
          disabled={pending !== null}
          title={opt.hint}
          onClick={() => handleClick(opt.grade)}
          className={`rounded-md px-2 py-3 text-sm font-medium text-white disabled:opacity-50 ${opt.className}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
