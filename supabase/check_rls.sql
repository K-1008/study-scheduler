-- RLSとポリシーが正しく設定されているかの確認用クエリ
-- Supabase の SQL Editor に貼り付けて Run してください。
--
-- 期待される結果(3行):
--   items          | true | 4
--   review_logs    | true | 2
--   review_states  | true | 4
--
-- rls_enabled が false、または policy_count が 0 の場合は
-- 0001_init_schema.sql を最初から流し直してください。

select
  t.tablename,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_tables t
join pg_class c
  on c.relname = t.tablename
join pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = t.schemaname
left join pg_policies p
  on p.schemaname = t.schemaname
 and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename in ('items', 'review_states', 'review_logs')
group by t.tablename, c.relrowsecurity
order by t.tablename;
