import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type FsrsSettings } from "@/lib/fsrs";

export interface UserSettingsRow {
  request_retention: number;
  fsrs_params: number[] | null;
  optimized_at: string | null;
  optimized_review_count: number | null;
  /** 科目ごとの目標保持率。{"E資格": 0.95} の形。未設定の科目は全体設定に従う */
  tag_retention: Record<string, number> | null;
}

/**
 * ログイン中ユーザーのFSRS設定を取得する。
 *
 * tag を渡すと、その科目に個別の目標保持率が設定されていればそれを使う。
 * 試験が近い科目だけ間隔を詰める、といった使い方のため。
 * 未設定(またはタグなし)の場合は全体設定に従う。
 */
export async function getUserSettings(tag?: string | null): Promise<FsrsSettings> {
  const row = await getUserSettingsRow();
  if (!row) return DEFAULT_SETTINGS;

  const perTag = tag ? row.tag_retention?.[tag] : undefined;

  return {
    requestRetention: typeof perTag === "number" ? perTag : row.request_retention,
    params: row.fsrs_params,
  };
}

/** 設定行そのもの(最適化の実行履歴も含む)。未設定なら null */
export async function getUserSettingsRow(): Promise<UserSettingsRow | null> {
  const supabase = await createClient();

  // 列を列挙せず * にしている。マイグレーションを実行する前でも
  // 「列が無い」エラーで全設定が既定値に落ちるのを避けるため。
  const { data, error } = await supabase.from("user_settings").select("*").maybeSingle();

  // テーブル未作成でもアプリが落ちないようにする
  if (error) return null;
  return (data as UserSettingsRow | null) ?? null;
}
