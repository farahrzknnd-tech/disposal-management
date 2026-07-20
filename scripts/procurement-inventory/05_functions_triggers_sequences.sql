-- Phase 1B / 05: functions, triggers and sequences related to the legacy module
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%po%'
    or p.proname ilike '%approval%'
    or p.proname ilike '%quota%'
    or p.proname ilike '%register%'
    or p.proname ilike '%activity%'
    or p.proname ilike '%steel%'
  )
order by p.proname, identity_arguments;

select
  event_object_schema as table_schema,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'clusters', 'contractors', 'suppliers', 'materials', 'statuses',
    'steel_diameters', 'steel_quotas', 'po_materials', 'po_material_items',
    'po_besi', 'po_besi_items', 'approvals', 'activities'
  )
order by event_object_table, trigger_name, event_manipulation;

select
  sequence_schema,
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment,
  cycle_option
from information_schema.sequences
where sequence_schema = 'public'
order by sequence_name;
