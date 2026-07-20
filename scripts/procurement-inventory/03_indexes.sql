-- Phase 1B / 03: indexes and usage statistics
with target_tables(table_name) as (
  values
    ('clusters'), ('contractors'), ('suppliers'), ('materials'), ('statuses'),
    ('steel_diameters'), ('steel_quotas'), ('po_materials'), ('po_material_items'),
    ('po_besi'), ('po_besi_items'), ('approvals'), ('activities')
)
select
  i.schemaname as table_schema,
  i.tablename as table_name,
  i.indexname as index_name,
  i.indexdef as index_definition,
  coalesce(s.idx_scan, 0) as index_scans,
  coalesce(s.idx_tup_read, 0) as tuples_read,
  coalesce(s.idx_tup_fetch, 0) as tuples_fetched
from pg_indexes i
join target_tables t on t.table_name = i.tablename
left join pg_stat_user_indexes s
  on s.schemaname = i.schemaname
 and s.relname = i.tablename
 and s.indexrelname = i.indexname
where i.schemaname = 'public'
order by i.tablename, i.indexname;
