"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rating, type Grade } from "ts-fsrs";
import { submitReview } from "./actions";

const OPTIONS: { rating: Grade; label: string; className: string }[] = [
  { rating: Rating.Again, label: "Again", className: "bg-red-600 hover:bg-red-500" },
  { rating: Rating.Hard, label: "Hard", className: "bg-orange-500 hover:bg-orange-400" },
  { rating: Rating.Good, label: "Good", className: "bg-green-600 hover:bg-green-500" },
  { rating: Rating.Easy, label: "Easy", className: "bg-blue-600 hover:bg-blue-500" },
];

export function ReviewButtons({ itemId }: { itemId: string }) {
  const [pending, setPending] = useState<Grade | null>(null);
  const router = useRouter();

  async function handleClick(rating: Grade) {
    setPending(rating);
    try {
      await submitReview(itemId, rating);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.rating}
          type="button"
          disabled={pending !== null}
          onClick={() => handleClick(opt.rating)}
          className={`rounded-md px-3 py-3 text-sm font-medium text-white disabled:opacity-50 ${opt.className}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
