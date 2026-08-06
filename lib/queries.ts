import { createClient } from "@/lib/supabase/server";
import type { ItemWithReviewState, ReviewLogRow } from "@/lib/types";

/** 全ての(未アーカイブ)項目を、FSRSの現在状態付きで取得する */
export async function getActiveItems(): Promise<ItemWithReviewState[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, title, tag, is_archived, created_at, review_states(due, state, stability, difficulty, reps, lapses)",
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ItemWithReviewState[];
}

/** 復習期日(due)が現在時刻以前の項目を、期日が近い順に取得する */
export async function getDueItems(): Promise<ItemWithReviewState[]> {
  const items = await getActiveItems();
  const now = Date.now();
  return items
    .filter((item) => item.review_states && new Date(item.review_states.due).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.review_states!.due).getTime() - new Date(b.review_states!.due).getTime(),
    );
}

export async function getItemDetail(itemId: string) {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select(
      "id, title, tag, is_archived, created_at, review_states(due, state, stability, difficulty, reps, lapses)",
    )
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
