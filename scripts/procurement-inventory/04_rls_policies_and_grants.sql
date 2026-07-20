-- Phase 1B / 04: RLS state, policies and table grants
with target_tables(table_name) as (
  values
    ('clusters'), ('contractors'), ('suppliers'), ('materials'), ('statuses'),
    ('steel_diameters'), ('steel_quotas'), ('po_materials'), ('po_material_items'),
    ('po_besi'), ('po_besi_items'), ('approvals'), ('activities')
)
select
  ns.nspname as table_schema,
  cls.relname as table_name,
  cls.relrowsecurity as rls_enabled,
  cls.relforcerowsecurity as rls_forced
from pg_class cls
join pg_namespace ns on ns.oid = cls.relnamespace
join target_tables t on t.table_name = cls.relname
where ns.nspname = 'public'
  and cls.relkind = 'r'
order by cls.relname;

select
  schemaname as table_schema,
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in (
    'clusters', 'contractors', 'suppliers', 'materials', 'statuses',
    'steel_diameters', 'steel_quotas', 'po_materials', 'po_material_items',
    'po_besi', 'po_besi_items', 'approvals', 'activities'
  )
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'clusters', 'contractors', 'suppliers', 'materials', 'statuses',
    'steel_diameters', 'steel_quotas', 'po_materials', 'po_material_items',
    'po_besi', 'po_besi_items', 'approvals', 'activities'
  )
order by table_name, grantee, privilege_type;
