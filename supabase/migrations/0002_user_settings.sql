-- ユーザーごとのFSRS設定
--
-- Supabase の SQL Editor に全文を貼り付けて Run してください。
-- 何度実行しても同じ結果になります。
--
-- 1文を1行に収めています。create policy を複数行に分けると、環境に
-- よっては改行で文が切られ "syntax error at or near for" になります。
--
-- 列の意味:
--   request_retention      目標保持率。復習時に思い出せる確率をどこに置くか。FSRSの既定は 0.9
--   fsrs_params            個人最適化した21個のパラメータ。null なら既定値を使う
--   optimized_at           最後に最適化を実行した日時
--   optimized_review_count その時点で学習に使ったアイテム数

create table if not exists public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.user_settings enable row level security;
alter table public.user_settings add column if not exists request_retention double precision not null default 0.9;
alter table public.user_settings add column if not exists fsrs_params jsonb;
alter table public.user_settings add column if not exists optimized_at timestamptz;
alter table public.user_settings add column if not exists optimized_review_count integer;
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();
alter table public.user_settings drop constraint if exists user_settings_retention_range;
alter table public.user_settings add constraint user_settings_retention_range check (request_retention > 0.7 and request_retention <= 0.99);
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id);
drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings for delete using (auth.uid() = user_id);
