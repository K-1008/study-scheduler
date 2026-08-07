import { createClient } from "@/lib/supabase/server";
import type { ItemWithReviewState, ReviewLogRow } from "@/lib/types";
import { toDayKey, todayKey, shiftDayKey } from "@/lib/date";

const ITEM_SELECT =
  "id, title, tag, is_archived, created_at, review_states(due, state, stability, difficulty, reps, lapses), review_logs(count)";

/**
 * 全ての項目を、FSRSの現在状態と復習履歴の件数付きで取得する。
 *
 * is_archived では絞らない。アーカイブ機能は廃止したため、フィルタを
 * 残すと過去にアーカイブした項目が一覧に出ず削除もできなくなる。
 */
export async function getActiveItems(): Promise<ItemWithReviewState[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ItemWithReviewState[];
}

/** 登録されているタグの一覧(重複なし・五十音順) */
export async function getTags(): Promise<string[]> {
  const items = await getActiveItems();
  const tags = new Set<string>();
  for (const item of items) {
    if (item.tag) tags.add(item.tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "ja"));
}

/**
 * 復習期日(due)が現在時刻以前の項目を、期日が近い順に取得する。
 * tag を渡すとその科目だけに絞り込む。
 */
export async function getDueItems(tag?: string): Promise<ItemWithReviewState[]> {
  const items = await getActiveItems();
  const now = Date.now();
  return items
    .filter((item) => item.review_states && new Date(item.review_states.due).getTime() <= now)
    .filter((item) => !tag || item.tag === tag)
    .sort(
      (a, b) =>
        new Date(a.review_states!.due).getTime() - new Date(b.review_states!.due).getTime(),
    );
}

export async function getItemDetail(itemId: string) {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .single();
  if (itemError) throw new Error(itemError.message);

  const { data: logs, error: logsError } = await supabase
    .from("review_logs")
    .select("id, rating, reviewed_at, stability_after, difficulty_after, scheduled_days")
    .eq("item_id", itemId)
    .order("reviewed_at", { ascending: false });
  if (logsError) throw new Error(logsError.message);

  return {
    item: item as unknown as ItemWithReviewState,
    logs: (logs ?? []) as ReviewLogRow[],
  };
}

// ============================================================
// カレンダー
// ============================================================

export interface CalendarDay {
  key: string;
  count: number;
  items: { id: string; title: string; tag: string | null }[];
}

/**
 * 復習予定を日付ごとにまとめる。
 * 期日を過ぎた項目はすべて「今日」に寄せる(実際に今日やるべきものなので)。
 */
export async function getCalendarSchedule(): Promise<Map<string, CalendarDay>> {
  const items = await getActiveItems();
  const today = todayKey();
  const byDay = new Map<string, CalendarDay>();

  for (const item of items) {
    if (!item.review_states) continue;
    const due = toDayKey(new Date(item.review_states.due));
    const key = due < today ? today : due;

    const day = byDay.get(key) ?? { key, count: 0, items: [] };
    day.count += 1;
    day.items.push({ id: item.id, title: item.title, tag: item.tag });
    byDay.set(key, day);
  }

  return byDay;
}

// ============================================================
// 統計
// ============================================================

export interface Stats {
  totalItems: number;
  totalReviews: number;
  dueToday: number;
  streakDays: number;
  /** 直近30日の日別復習件数(古い順) */
  daily: { key: string; count: number }[];
  /** 評価ごとの回数(1=Again 〜 4=Easy) */
  ratingCounts: [number, number, number, number];
  /** タグ別の項目数(多い順) */
  byTag: { tag: string; count: number }[];
}

const DAILY_WINDOW = 30;

export async function getStats(): Promise<Stats> {
  const supabase = await createClient();

  const items = await getActiveItems();

  const { data: logs, error } = await supabase
    .from("review_logs")
    .select("rating, reviewed_at")
    .order("reviewed_at", { ascending: false });
  if (error) throw new Error(error.message);

  const allLogs = (logs ?? []) as { rating: number; reviewed_at: string }[];
  const today = todayKey();
  const now = Date.now();

  // --- 日別件数(直近30日。復習が無かった日も0で埋める) ---
  const counts = new Map<string, number>();
  for (const log of allLogs) {
    const key = toDayKey(new Date(log.reviewed_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const daily: { key: string; count: number }[] = [];
  for (let i = DAILY_WINDOW - 1; i >= 0; i--) {
    const key = shiftDayKey(today, -i);
    daily.push({ key, count: counts.get(key) ?? 0 });
  }

  // --- 連続学習日数(今日または昨日を起点に遡る) ---
  let streakDays = 0;
  let cursor = counts.has(today) ? today : shiftDayKey(today, -1);
  while (counts.has(cursor)) {
    streakDays += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  // --- 評価の分布 ---
  const ratingCounts: [number, number, number, number] = [0, 0, 0, 0];
  for (const log of allLogs) {
    if (log.rating >= 1 && log.rating <= 4) ratingCounts[log.rating - 1] += 1;
  }

  // --- タグ別 ---
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    const tag = item.tag ?? "(タグなし)";
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const byTag = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalItems: items.length,
    totalReviews: allLogs.length,
    dueToday: items.filter(
      (i) => i.review_states && new Date(i.review_states.due).getTime() <= now,
    ).length,
    streakDays,
    daily,
    ratingCounts,
    byTag,
  };
}
