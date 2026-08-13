-- 科目ごとの目標保持率
--
-- Supabase の SQL Editor に貼り付けて Run してください。この1行だけです。
-- 何度実行しても同じ結果になります。
--
-- {"E資格": 0.95, "数学": 0.85} のような形で持つ。設定が無い科目は
-- user_settings.request_retention(全体設定)に従う。
--
-- 専用テーブルにせず jsonb 列にしているのは、個人利用で科目が多くて
-- 十数個であり、RLSポリシーを含む新テーブルを作るほどの規模ではないため。
-- user_settings 自体のRLSで保護される。

alter table public.user_settings add column if not exists tag_retention jsonb not null default '{}'::jsonb;
