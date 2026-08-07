"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initialReviewState, scheduleNext } from "@/lib/fsrs";
import { parseGrade, describeInterval } from "@/lib/ratings";
import { dayKeyToDate, isDayKey } from "@/lib/date";
import { getUserSettings } from "@/lib/settings";

/**
 * 「今日解いた問題」を追加する。
 *
 * 追加する時点で既に解き終わっているので、項目の作成と初回評価を
 * 1アクションでまとめて行う。登録 → あとで評価、と分けない。
 */
export async function addSolvedItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const title = String(formData.get("title") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const grade = parseGrade(formData.get("rating"));

  if (!title) redirect(`/?error=${encodeURIComponent("タイトルを入力してください")}`);
  if (!grade) redirect(`/?error=${encodeURIComponent("出来を選んでください")}`);

  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: user.id, title, tag: tag || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // 空のカードにその場で評価を適用し、初回の復習結果として保存する
  const now = new Date();
  const settings = await getUserSettings();
  const { nextRow } = scheduleNext(initialReviewState(now), grade, now, settings);

  const { error: stateError } = await supabase
    .from("review_states")
    .insert({ item_id: item.id, user_id: user.id, ...nextRow });
  if (stateError) throw new Error(stateError.message);

  const { error: logError } = await supabase.from("review_logs").insert({
    item_id: item.id,
    user_id: user.id,
    rating: grade,
    reviewed_at: now.toISOString(),
    stability_after: nextRow.stability,
    difficulty_after: nextRow.difficulty,
    scheduled_days: nextRow.scheduled_days,
  });
  if (logError) throw new Error(logError.message);

  revalidatePath("/");
  const when = describeInterval(new Date(nextRow.due), now);
  redirect(`/?added=${encodeURIComponent(`${title} を登録しました。次回は${when}です。`)}`);
}

/** まだ解いていない問題を、復習待ちとして登録する */
export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const title = String(formData.get("title") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!title) redirect(`/?error=${encodeURIComponent("タイトルを入力してください")}`);

  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: user.id, title, tag: tag || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: stateError } = await supabase
    .from("review_states")
    .insert({ item_id: item.id, user_id: user.id, ...initialReviewState() });
  if (stateError) throw new Error(stateError.message);

  revalidatePath("/");
  redirect(`/?added=${encodeURIComponent(`${title} を登録しました。今日の復習に追加されています。`)}`);
}

/**
 * タイトル・科目・次回復習日を更新する。
 *
 * 日付を変えるときも FSRS の記憶状態(stability / difficulty / reps /
 * lapses / state / last_review)には触らず due だけ書き換える。
 * ts-fsrs は経過日数を last_review から計算しており due を入力に
 * 使わないため、これで次回評価時の推定を壊さずに済む。
 */
export async function updateItem(itemId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const due = formData.get("due");
  if (!title) throw new Error("タイトルは必須です");

  const { error } = await supabase
    .from("items")
    .update({ title, tag: tag || null })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  if (isDayKey(due)) {
    const { error: dueError } = await supabase
      .from("review_states")
      .update({ due: dayKeyToDate(due).toISOString(), updated_at: new Date().toISOString() })
      .eq("item_id", itemId);
    if (dueError) throw new Error(dueError.message);
  }

  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
}

/**
 * 項目を完全に削除する。
 *
 * review_states と review_logs は外部キーの on delete cascade で
 * 一緒に消える。カスケードは参照整合性として実行されRLSをバイパス
 * するので、review_logs にDELETEポリシーが無くても問題ない。
 * 他人の項目を消せないことは items_delete_own ポリシーが保証する。
 */
export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
