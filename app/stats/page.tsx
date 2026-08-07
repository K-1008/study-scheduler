import { getStats } from "@/lib/queries";
import { ChartStyles, DailyReviewChart, RatingChart, TagChart } from "./charts";

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
        <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{unit}</span>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {children}
    </div>
  );
}

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <ChartStyles />

      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">学習の記録</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="登録項目" value={stats.totalItems} unit="件" />
        <StatTile label="復習した回数" value={stats.totalReviews} unit="回" />
        <StatTile label="今日の復習" value={stats.dueToday} unit="件" />
        <StatTile label="連続学習" value={stats.streakDays} unit="日" />
      </div>

      <div className="space-y-6">
        <Card>
          <DailyReviewChart data={stats.daily} />
        </Card>

        <Card>
          <RatingChart counts={stats.ratingCounts} />
        </Card>

        {stats.byTag.length > 0 && (
          <Card>
            <TagChart data={stats.byTag} />
          </Card>
        )}
      </div>
    </main>
  );
}
