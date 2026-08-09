"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { RATING_OPTIONS, RATING_BUTTON_BASE } from "@/lib/ratings";

/**
 * 追加フォームの評価ボタン。
 *
 * 押した瞬間の手応え(active:scale-95 と濃い色)に加えて、送信中は
 * どれを押したかを表示したうえで全ボタンを無効にする。通信が遅いと
 * 押したことが分からず二度押ししやすく、項目が重複して登録される
 * ため、その防止も兼ねている。
 *
 * useFormStatus は form の子要素でしか使えないので、フォーム本体から
 * 切り出してこのコンポーネントにしている。
 */
export function AddRatingButtons() {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-4 gap-2">
      {RATING_OPTIONS.map((opt) => {
        // 送信中だけ押下表示にする。pending が下りれば自動的に元へ戻るので、
        // useEffect で clicked を消す必要がない
        const isClicked = pending && clicked === opt.grade;
        return (
          <button
            key={opt.grade}
            type="submit"
            name="rating"
            value={opt.grade}
            title={opt.hint}
            disabled={pending}
            onClick={() => setClicked(opt.grade)}
            className={`${RATING_BUTTON_BASE} ${
              isClicked
                ? `${opt.activeClassName} scale-95`
                : `${opt.className} ${pending ? "opacity-40" : ""}`
            }`}
          >
            {isClicked ? "記録中…" : opt.label}
          </button>
        );
      })}
    </div>
  );
}
