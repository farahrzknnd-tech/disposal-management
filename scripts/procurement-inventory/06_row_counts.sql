-- Phase 1B / 06: exact row counts without exposing transaction contents
-- Each query is guarded so a missing table does not stop the inventory.
create temporary table if not exists inventory_row_counts (
  table_name text primary key,
  exact_rows bigint,
  captured_at timestamptz default now()
) on commit drop;

create or replace function pg_temp.capture_count(p_table text)
returns void
language plpgsql
as $$
declare
  v_count bigint;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    insert into inventory_row_counts(table_name, exact_rows)
    values (p_table, null)
    on conflict (table_name) do update set exact_rows = excluded.exact_rows;
    return;
  end if;

  execute format('select count(*) from public.%I', p_table) into v_count;
  insert into inventory_row_counts(table_name, exact_rows)
  values (p_table, v_count)
  on conflict (table_name) do update set exact_rows = excluded.exact_rows;
end;
$$;

select pg_temp.capture_count(x.table_name)
from (values
  ('clusters'), ('contractors'), ('suppliers'), ('materials'), ('statuses'),
  ('steel_diameters'), ('steel_quotas'), ('po_materials'), ('po_material_items'),
  ('po_besi'), ('po_besi_items'), ('approvals'), ('activities')
) as x(table_name);

select table_name, exact_rows, captured_at
from inventory_row_counts
order by table_name;
