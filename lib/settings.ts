import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type FsrsSettings } from "@/lib/fsrs";

export interface UserSettingsRow {
  request_retention: number;
  fsrs_params: number[] | null;
  optimized_at: string | null;
  optimized_review_count: number | null;
}

/**
 * ログイン中ユーザーのFSRS設定を取得する。
 * 未設定(行が無い)場合は既定値を返す。
 */
export async function getUserSettings(): Promise<FsrsSettings> {
  const row = await getUserSettingsRow();
  if (!row) return DEFAULT_SETTINGS;
  return {
    requestRetention: row.request_retention,
    params: row.fsrs_params,
  };
}

/** 設定行そのもの(最適化の実行履歴も含む)。未設定なら null */
export async function getUserSettingsRow(): Promise<UserSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("request_retention, fsrs_params, optimized_at, optimized_review_count")
    .maybeSingle();

  // テーブル未作成でもアプリが落ちないようにする(マイグレーション前の状態)
  if (error) return null;
  return (data as UserSettingsRow | null) ?? null;
}
