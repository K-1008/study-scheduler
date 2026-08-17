"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initialReviewState, scheduleNext } from "@/lib/fsrs";
import { parseGrade, describeInterval } from "@/lib/ratings";
import { dayKeyToDate, isDayKey, recordedAtFor, toDayKey, todayKey } from "@/lib/date";
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

  // 解いた日を指定できる。深夜0時をまたいだ分を前日に記録したい場合や、
  // 前の日の分をあとからまとめて入れる場合のため。未指定なら今日。
  const solvedOn = formData.get("solved_on");
  const now = isDayKey(solvedOn) ? recordedAtFor(solvedOn) : new Date();

  // 空のカードにその場で評価を適用し、初回の復習結果として保存する。
  // 科目に個別の目標保持率があればそれを使う
  const settings = await getUserSettings(tag || null);
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

  // 過去の日付に記録した場合は、いつの分として入ったかを明示する
  const solvedKey = toDayKey(now);
  const prefix =
    solvedKey === todayKey()
      ? `${title} を登録しました。`
      : `${title} を ${solvedKey} の記録として登録しました。`;
  const when = describeInterval(new Date(nextRow.due), new Date());
  redirect(`/?added=${encodeURIComponent(`${prefix}次回は${when}です。`)}`);
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

  // 日付が実際に変わったときだけ書き換える。
  //
  // フォームの日付欄は常に送信されるので、以前は無条件に更新していた。
  // しかし表示用の値は toDayKey(時刻を落とし、午前4時ぶん巻き戻す)で
  // 作っているため、それを dayKeyToDate でその日の0時に戻すと元の時刻が
  // 失われる。タイトルだけ直したつもりが due が4〜26時間early に動き、
  // 深夜が期日の項目では丸1日ずれていた。
  if (isDayKey(due)) {
    const { data: current } = await supabase
      .from("review_states")
      .select("due")
      .eq("item_id", itemId)
      .maybeSingle();

    const unchanged = current?.due && toDayKey(new Date(current.due)) === due;
    if (!unchanged) {
      const { error: dueError } = await supabase
        .from("review_states")
        .update({ due: dayKeyToDate(due).toISOString(), updated_at: new Date().toISOString() })
        .eq("item_id", itemId);
      if (dueError) throw new Error(dueError.message);
    }
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

// ============================================================
// 一時停止
//
// 試験や資格が終わって不要になった項目を復習から外す。削除と違い
// FSRSの状態も履歴も残るので、再受験や再履修のときに元の間隔から
// 再開できる。DBの列名は初期スキーマの名残で is_archived。
// ============================================================

async function setSuspended(match: { itemId?: string; tag?: string }, suspended: boolean) {
  const supabase = await createClient();
  const query = supabase.from("items").update({ is_archived: suspended });

  const { error } = match.itemId
    ? await query.eq("id", match.itemId)
    : await query.eq("tag", match.tag!);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  if (match.itemId) revalidatePath(`/items/${match.itemId}`);
}

export async function suspendItem(itemId: string) {
  await setSuspended({ itemId }, true);
}

export async function resumeItem(itemId: string) {
  await setSuspended({ itemId }, false);
}

/**
 * 科目まるごと停止・再開する。
 *
 * 試験は科目単位で終わるので、1件ずつ止めるのは現実的でない。
 * 実行後は絞り込みを外して / に戻す。全件停止するとそのタグが
 * getTags() から消え、絞り込み中の画面が空になって操作不能に
 * 見えるため。
 */
export async function suspendTag(tag: string) {
  await setSuspended({ tag }, true);
  redirect(`/?added=${encodeURIComponent(`「${tag}」を停止しました。停止中の一覧から再開できます。`)}`);
}

export async function resumeTag(tag: string) {
  await setSuspended({ tag }, false);
  redirect(`/?added=${encodeURIComponent(`「${tag}」を再開しました。`)}`);
}
