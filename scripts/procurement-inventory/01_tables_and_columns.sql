-- Phase 1B / 01: tables, columns, defaults, nullability, and estimated rows
with target_tables(table_name) as (
  values
    ('clusters'),
    ('contractors'),
    ('suppliers'),
    ('materials'),
    ('statuses'),
    ('steel_diameters'),
    ('steel_quotas'),
    ('po_materials'),
    ('po_material_items'),
    ('po_besi'),
    ('po_besi_items'),
    ('approvals'),
    ('activities')
)
select
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.datetime_precision,
  coalesce(s.n_live_tup, 0) as estimated_rows
from information_schema.columns c
join target_tables t on t.table_name = c.table_name
left join pg_stat_user_tables s
  on s.schemaname = c.table_schema
 and s.relname = c.table_name
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- Missing expected tables are surfaced explicitly.
with target_tables(table_name) as (
  values
    ('clusters'), ('contractors'), ('suppliers'), ('materials'), ('statuses'),
    ('steel_diameters'), ('steel_quotas'), ('po_materials'), ('po_material_items'),
    ('po_besi'), ('po_besi_items'), ('approvals'), ('activities')
)
select
  t.table_name,
  case when x.table_name is null then 'MISSING' else 'PRESENT' end as inventory_status
from target_tables t
left join information_schema.tables x
  on x.table_schema = 'public'
 and x.table_name = t.table_name
order by t.table_name;
