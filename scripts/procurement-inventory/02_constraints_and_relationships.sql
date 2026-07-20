-- Phase 1B / 02: primary keys, foreign keys, unique and check constraints
with target_tables(table_name) as (
  values
    ('clusters'), ('contractors'), ('suppliers'), ('materials'), ('statuses'),
    ('steel_diameters'), ('steel_quotas'), ('po_materials'), ('po_material_items'),
    ('po_besi'), ('po_besi_items'), ('approvals'), ('activities')
)
select
  ns.nspname as table_schema,
  cls.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUSION'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition,
  ref_ns.nspname as referenced_schema,
  ref_cls.relname as referenced_table,
  con.condeferrable as is_deferrable,
  con.condeferred as initially_deferred,
  con.convalidated as is_validated
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace ns on ns.oid = cls.relnamespace
join target_tables t on t.table_name = cls.relname
left join pg_class ref_cls on ref_cls.oid = con.confrelid
left join pg_namespace ref_ns on ref_ns.oid = ref_cls.relnamespace
where ns.nspname = 'public'
order by cls.relname, constraint_type, con.conname;
