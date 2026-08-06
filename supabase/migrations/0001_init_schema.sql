-- 勉強スケジュール管理アプリ 初期スキーマ
-- Supabase の SQL Editor でそのまま実行してください。

-- ============================================================
-- items: 演習項目
-- ============================================================
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  tag text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on public.items(user_id);

alter table public.items enable row level security;

create policy "items_select_own" on public.items
  for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items
  for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items
  for update using (auth.uid() = user_id);
create policy "items_delete_own" on public.items
  for delete using (auth.uid() = user_id);

-- ============================================================
-- review_states: FSRSの現在状態(items と 1:1)
-- state: 0=New, 1=Learning, 2=Review, 3=Relearning (ts-fsrs の State enum に対応)
-- ============================================================
create table if not exists public.review_states (
  item_id uuid primary key references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0,
  last_review timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists review_states_user_due_idx on public.review_states(user_id, due);

alter table public.review_states enable row level security;

create policy "review_states_select_own" on public.review_states
  for select using (auth.uid() = user_id);
create policy "review_states_insert_own" on public.review_states
  for insert with check (auth.uid() = user_id);
create policy "review_states_update_own" on public.review_states
  for update using (auth.uid() = user_id);
create policy "review_states_delete_own" on public.review_states
  for delete using (auth.uid() = user_id);

-- ============================================================
-- review_logs: 復習履歴(append-only)
-- rating: 1=Again, 2=Hard, 3=Good, 4=Easy (ts-fsrs の Rating enum に対応)
-- ============================================================
create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null default now(),
  stability_after double precision not null,
  difficulty_after double precision not null,
  scheduled_days integer not null
);

create index if not exists review_logs_item_id_idx on public.review_logs(item_id, reviewed_at desc);
create index if not exists review_logs_user_id_idx on public.review_logs(user_id, reviewed_at desc);

alter table public.review_logs enable row level security;

create policy "review_logs_select_own" on public.review_logs
  for select using (auth.uid() = user_id);
create policy "review_logs_insert_own" on public.review_logs
  for insert with check (auth.uid() = user_id);
