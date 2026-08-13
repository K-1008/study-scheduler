"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { optimizeParameters, MIN_TRAINABLE_ITEMS, type RawLog } from "@/lib/optimizer";

function tableHint(message: string) {
  if (message.includes("tag_retention")) {
    return "tag_retention 列がまだありません。supabase/migrations/0003_tag_retention.sql を Supabase の SQL Editor で実行してください(1行だけです)。";
  }
  return message.includes("user_settings")
    ? "user_settings テーブルがまだ作られていません。supabase/migrations/0002_user_settings.sql を Supabase の SQL Editor で実行してください。"
    : message;
}

export async function saveRetention(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const value = Number(formData.get("request_retention"));
  if (!Number.isFinite(value) || value <= 0.7 || value > 0.99) {
    redirect(`/settings?error=${encodeURIComponent("保持率は0.71〜0.99の範囲で指定してください")}`);
  }

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, request_retention: value, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) redirect(`/settings?error=${encodeURIComponent(tableHint(error.message))}`);

  revalidatePath("/settings");
  revalidatePath("/");
  redirect(
    `/settings?saved=${encodeURIComponent(`目標保持率を ${value} に変更しました。次回以降の復習から適用されます。`)}`,
  );
}

/**
 * 科目ごとの目標保持率をまとめて保存する。
 *
 * フォームは科目ごとに `tag:<科目名>` という名前で値を送る。
 * 空文字は「全体設定に従う」で、その科目のキーを削除する。
 */
export async function saveTagRetention(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const tagRetention: Record<string, number> = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("tag:")) continue;
    const tag = key.slice(4);
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) continue; // 空 = 全体設定に従う
    if (value <= 0.7 || value > 0.99) {
      redirect(`/settings?error=${encodeURIComponent(`「${tag}」の保持率が範囲外です`)}`);
    }
    tagRetention[tag] = value;
  }

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, tag_retention: tagRetention, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) redirect(`/settings?error=${encodeURIComponent(tableHint(error.message))}`);

  revalidatePath("/settings");
  revalidatePath("/");

  const count = Object.keys(tagRetention).length;
  redirect(
    `/settings?saved=${encodeURIComponent(
      count === 0
        ? "科目ごとの設定をすべて解除しました。全体設定に従います。"
        : `${count}科目に個別の保持率を設定しました。次回以降の復習から適用されます。`,
    )}`,
  );
}

export async function runOptimization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const { data, error } = await supabase
    .from("review_logs")
    .select("item_id, rating, reviewed_at")
    .order("reviewed_at", { ascending: true });
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  let result;
  try {
    result = await optimizeParameters((data ?? []) as RawLog[]);
  } catch (e) {
    redirect(`/settings?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  if (!result) {
    redirect(
      `/settings?error=${encodeURIComponent(`学習に使えるデータが ${MIN_TRAINABLE_ITEMS} 件に足りません。`)}`,
    );
  }

  const { error: saveError } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      fsrs_params: result.params,
      optimized_at: new Date().toISOString(),
      optimized_review_count: result.itemCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (saveError) redirect(`/settings?error=${encodeURIComponent(tableHint(saveError.message))}`);

  revalidatePath("/settings");
  revalidatePath("/");

  const msg = result.changed
    ? `最適化しました。予測のずれ(logLoss)が ${result.before.logLoss.toFixed(4)} → ${result.after.logLoss.toFixed(4)} になりました。`
    : "実行しましたが、データがまだ少ないため既定値のままです。復習が増えてから再度お試しください。";
  redirect(`/settings?saved=${encodeURIComponent(msg)}`);
}

/**
 * 合成データで最適化の実行経路だけを検証する。
 *
 * ネイティブモジュールはビルドが通っても実行時に読めないことがある。
 * 実データが64件に届くまで待つと、壊れていた場合に数か月後まで
 * 気づけないので、いつでも確認できるようにしておく。
 * 結果は保存しない。
 */
export async function testOptimizer() {
  const logs: RawLog[] = [];
  const base = Date.UTC(2026, 0, 1);
  for (let card = 0; card < 40; card++) {
    let day = 0;
    for (let i = 0; i < 4; i++) {
      logs.push({
        item_id: `synthetic-${card}`,
        rating: (card + i) % 4 === 0 ? 1 : 3,
        reviewed_at: new Date(base + day * 86400000).toISOString(),
      });
      day += 2 + i * 3;
    }
  }

  const started = Date.now();
  try {
    const result = await optimizeParameters(logs);
    if (!result) {
      redirect(`/settings?error=${encodeURIComponent("自己診断: 合成データの件数が不足しました(実装の不具合)")}`);
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    redirect(
      `/settings?saved=${encodeURIComponent(
        `自己診断に成功しました。この環境で最適化を実行できます(合成データ${result.itemCount}件を${secs}秒で処理)。結果は保存していません。`,
      )}`,
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(
      `/settings?error=${encodeURIComponent(
        `自己診断に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      )}`,
    );
  }
}

/** 個人最適化をやめて既定パラメータに戻す */
export async function resetParameters() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      fsrs_params: null,
      optimized_at: null,
      optimized_review_count: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) redirect(`/settings?error=${encodeURIComponent(tableHint(error.message))}`);

  revalidatePath("/settings");
  revalidatePath("/");
  redirect(`/settings?saved=${encodeURIComponent("既定のパラメータに戻しました。")}`);
}
