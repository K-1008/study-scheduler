-- ユーザーごとのFSRS設定
--
-- Supabase の SQL Editor に全文を貼り付けて Run してください。
-- 何度実行しても同じ結果になります。

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- 目標保持率。復習時にどれくらいの確率で思い出せる状態にしたいか。
  -- FSRSの既定は 0.9。上げるほど間隔が短くなり復習量が増える。
  request_retention double precision not null default 0.9
    check (request_retention > 0.7 and request_retention <= 0.99),

  -- 個人最適化したFSRSパラメータ(21個)。null なら既定値を使う。
  fsrs_params jsonb,

  -- 最後に最適化を実行した日時と、その時点の学習ログ件数
  optimized_at timestamptz,
  optimized_review_count integer,

  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete using (auth.uid() = user_id);
