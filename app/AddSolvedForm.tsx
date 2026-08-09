import { todayKey } from "@/lib/date";
import { AddRatingButtons } from "@/app/AddRatingButtons";
import { addSolvedItem, createItem } from "@/app/items/actions";

/**
 * 今日解いた問題を1アクションで登録するフォーム。
 * 評価ボタン自体が送信ボタンを兼ねている。
 */
export function AddSolvedForm({ tags }: { tags: string[] }) {
  const today = todayKey();

  return (
    <form
      action={addSolvedItem}
      className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        今日解いた問題を追加
      </h2>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="new-title" className="sr-only">
            タイトル
          </label>
          <input
            id="new-title"
            name="title"
            required
            placeholder="例: 積分の応用問題 第3章"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:w-36">
          <label htmlFor="new-tag" className="sr-only">
            科目
          </label>
          <input
            id="new-tag"
            name="tag"
            list="tag-suggestions"
            placeholder="科目(任意)"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <datalist id="tag-suggestions">
            {tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="new-solved-on" className="text-xs text-zinc-500 dark:text-zinc-400">
          解いた日
        </label>
        <input
          id="new-solved-on"
          type="date"
          name="solved_on"
          defaultValue={today}
          max={today}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-400">
          前の日の分をあとから記録するときに変更します
        </span>
      </div>

      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        出来はどうでしたか?(選ぶと登録されます)
      </p>
      <AddRatingButtons />

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          まだ解いていない問題を登録する
        </summary>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          評価なしで登録し、今日の復習リストに並べます。
        </p>
        <button
          type="submit"
          formAction={createItem}
          className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          評価なしで登録
        </button>
      </details>
    </form>
  );
}
