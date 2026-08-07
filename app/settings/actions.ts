"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, request_retention: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    const hint = error.message.includes("user_settings")
      ? "user_settings テーブルがまだ作られていません。supabase/migrations/0002_user_settings.sql を Supabase の SQL Editor で実行してください。"
      : error.message;
    redirect(`/settings?error=${encodeURIComponent(hint)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/");
  redirect(`/settings?saved=${encodeURIComponent(`目標保持率を ${value} に変更しました。次回以降の復習から適用されます。`)}`);
}
