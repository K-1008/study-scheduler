import Link from "next/link";
import { notFound } from "next/navigation";
import { getCalendarSchedule } from "@/lib/queries";

export default async function CalendarDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();

  const schedule = await getCalendarSchedule();
  const entry = schedule.get(day);
  const [y, m, d] = day.split("-").map(Number);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href={`/calendar?m=${day.slice(0, 7)}`}
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← カレンダーに戻る
      </Link>

      <h1 className="mb-1 mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {y}年{m}月{d}日の復習予定
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {entry?.count ?? 0} 件
      </p>

      {!entry ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          この日の復習予定はありません。
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {entry.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link
                href={`/items/${item.id}`}
                className="truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {item.title}
              </Link>
              {item.tag && (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
