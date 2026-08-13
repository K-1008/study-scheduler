"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scheduleNext, type ReviewStateRow } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import type { Grade } from "ts-fsrs";

export async function submitReview(itemId: string, rating: Grade) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  // items(tag) を併せて取る。科目ごとの目標保持率を適用するため
  const { data: state, error } = await supabase
    .from("review_states")
    .select(
      "due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, items(tag)",
    )
    .eq("item_id", itemId)
    .single();
  if (error || !state) throw new Error(error?.message ?? "復習状態が見つかりません");

  // PostgREST は関連を単一オブジェクトで返すことも配列で返すこともある
  const joined = (state as unknown as {
    items: { tag: string | null } | { tag: string | null }[] | null;
  }).items;
  const tag = (Array.isArray(joined) ? joined[0] : joined)?.tag ?? null;

  const now = new Date();
  const settings = await getUserSettings(tag);
  const { nextRow } = scheduleNext(state as unknown as ReviewStateRow, rating, now, settings);

  const { error: updateError } = await supabase
    .from("review_states")
    .update(nextRow)
    .eq("item_id", itemId);
  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.from("review_logs").insert({
    item_id: itemId,
    user_id: user.id,
    rating,
    reviewed_at: now.toISOString(),
    stability_after: nextRow.stability,
    difficulty_after: nextRow.difficulty,
    scheduled_days: nextRow.scheduled_days,
  });
  if (logError) throw new Error(logError.message);

  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);

  // nextRow.due は ISO文字列。クライアントに返すのはこれだけで足りる
  return { nextDue: nextRow.due };
}
