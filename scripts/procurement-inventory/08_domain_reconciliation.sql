-- Phase 1B / 08: orphan and domain reconciliation summaries.
-- Output is aggregate only.
create temporary table if not exists inventory_reconciliation (
  module text,
  check_name text,
  affected_rows bigint,
  note text
) on commit drop;

create or replace function pg_temp.add_orphan_check(
  p_child_table text,
  p_child_column text,
  p_parent_table text,
  p_parent_column text default 'id'
) returns void
language plpgsql
as $$
declare v_count bigint;
begin
  if to_regclass(format('public.%I', p_child_table)) is null
     or to_regclass(format('public.%I', p_parent_table)) is null then return; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name=p_child_table and column_name=p_child_column) then return; end if;
  execute format($f$
    select count(*)
    from public.%I c
    left join public.%I p on p.%I = c.%I
    where c.%I is not null and p.%I is null
  $f$, p_child_table, p_parent_table, p_parent_column, p_child_column, p_child_column, p_parent_column)
  into v_count;
  insert into inventory_reconciliation values (
    p_child_table,
    'ORPHAN_' || upper(p_child_column),
    v_count,
    format('%I.%I -> %I.%I', p_child_table, p_child_column, p_parent_table, p_parent_column)
  );
end; $$;

select pg_temp.add_orphan_check(t,c,p) from (values
  ('po_materials','cluster_id','clusters'),
  ('po_materials','contractor_id','contractors'),
  ('po_materials','supplier_id','suppliers'),
  ('po_material_items','po_material_id','po_materials'),
  ('po_besi','cluster_id','clusters'),
  ('po_besi','contractor_id','contractors'),
  ('po_besi','supplier_id','suppliers'),
  ('po_besi_items','po_besi_id','po_besi'),
  ('po_besi_items','diameter_id','steel_diameters'),
  ('approvals','cluster_id','clusters'),
  ('approvals','contractor_id','contractors'),
  ('steel_quotas','cluster_id','clusters'),
  ('steel_quotas','contractor_id','contractors')
) x(t,c,p);

-- PO without items.
do $$
declare v_count bigint;
begin
  if to_regclass('public.po_materials') is not null and to_regclass('public.po_material_items') is not null then
    select count(*) into v_count from public.po_materials h
    where not exists (select 1 from public.po_material_items i where i.po_material_id = h.id);
    insert into inventory_reconciliation values ('po_materials','HEADER_WITHOUT_ITEMS',v_count,'PO Material header tanpa item');
  end if;
  if to_regclass('public.po_besi') is not null and to_regclass('public.po_besi_items') is not null then
    select count(*) into v_count from public.po_besi h
    where not exists (select 1 from public.po_besi_items i where i.po_besi_id = h.id);
    insert into inventory_reconciliation values ('po_besi','HEADER_WITHOUT_ITEMS',v_count,'PO Besi header tanpa item');
  end if;
end $$;

-- Invalid/negative numeric values when columns exist.
create or replace function pg_temp.add_negative_check(p_table text, p_column text)
returns void language plpgsql as $$
declare v_count bigint;
begin
  if to_regclass(format('public.%I', p_table)) is null then return; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name=p_table and column_name=p_column) then return; end if;
  execute format('select count(*) from public.%I where %I < 0', p_table, p_column) into v_count;
  insert into inventory_reconciliation values (p_table,'NEGATIVE_' || upper(p_column),v_count,p_column);
end $$;

select pg_temp.add_negative_check(t,c) from (values
  ('po_material_items','qty'),
  ('po_besi_items','jumlah_batang'),
  ('po_besi_items','coefficient'),
  ('po_besi_items','berat_kg'),
  ('steel_quotas','quota_kg'),
  ('steel_quotas','waste_percent'),
  ('steel_diameters','coefficient'),
  ('steel_diameters','diameter_mm')
) x(t,c);

select module, check_name, affected_rows, note
from inventory_reconciliation
order by module, check_name;
