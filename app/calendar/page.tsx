import Link from "next/link";
import { getCalendarSchedule } from "@/lib/queries";
import { todayKey } from "@/lib/date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM" を n ヶ月ずらす */
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** その月のカレンダーに並べる日付キー(前後の空白セルは null) */
function buildMonthGrid(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < first.getUTCDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const today = todayKey();
  const ym = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : today.slice(0, 7);

  const schedule = await getCalendarSchedule();
  const cells = buildMonthGrid(ym);
  const [year, month] = ym.split("-").map(Number);

  // その月に予定されている件数
  const monthTotal = cells.reduce(
    (sum, key) => sum + (key ? (schedule.get(key)?.count ?? 0) : 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/calendar?m=${shiftMonth(ym, -1)}`}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← 前月
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {year}年{month}月
        </h1>
        <Link
          href={`/calendar?m=${shiftMonth(ym, 1)}`}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          翌月 →
        </Link>
      </div>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        この月の復習予定 {monthTotal} 件
        {ym !== today.slice(0, 7) && (
          <Link href="/calendar" className="ml-2 underline">
            今月に戻る
          </Link>
        )}
      </p>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-medium ${
                i === 0
                  ? "text-red-600 dark:text-red-400"
                  : i === 6
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((key, i) => {
            if (!key) {
              return <div key={`empty-${i}`} className="min-h-16 border-zinc-100 dark:border-zinc-900" />;
            }
            const day = schedule.get(key);
            const isToday = key === today;
            const dayNum = Number(key.slice(8));

            return (
              <div
                key={key}
                className={`min-h-16 border-t border-l border-zinc-100 p-1 first:border-l-0 dark:border-zinc-900 ${
                  isToday ? "bg-amber-50 dark:bg-amber-950/30" : ""
                }`}
              >
                <div
                  className={`text-xs ${
                    isToday
                      ? "font-bold text-amber-700 dark:text-amber-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {dayNum}
                </div>
                {day && (
                  <Link
                    href={isToday ? "/" : `/calendar/${key}`}
                    className="mt-0.5 block rounded bg-blue-100 px-1 py-0.5 text-center text-xs font-medium text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
                  >
                    {day.count}件
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        期日を過ぎた項目は今日にまとめて表示されます。件数をタップすると内訳が見られます。
      </p>
    </main>
  );
}
