-- Phase 1B / 07: metadata-driven null/duplicate profile.
-- No full business row is returned.
create temporary table if not exists inventory_quality (
  table_name text,
  check_name text,
  affected_rows bigint,
  detail text
) on commit drop;

create or replace function pg_temp.add_null_check(p_table text, p_column text)
returns void
language plpgsql
as $$
declare v_count bigint;
begin
  if to_regclass(format('public.%I', p_table)) is null then return; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then return; end if;
  execute format('select count(*) from public.%I where %I is null', p_table, p_column) into v_count;
  insert into inventory_quality values (p_table, 'NULL_' || upper(p_column), v_count, p_column);
end; $$;

create or replace function pg_temp.add_blank_check(p_table text, p_column text)
returns void
language plpgsql
as $$
declare v_count bigint;
begin
  if to_regclass(format('public.%I', p_table)) is null then return; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then return; end if;
  execute format('select count(*) from public.%I where %I is not null and btrim(%I::text) = ''''', p_table, p_column, p_column) into v_count;
  insert into inventory_quality values (p_table, 'BLANK_' || upper(p_column), v_count, p_column);
end; $$;

create or replace function pg_temp.add_duplicate_check(p_table text, p_column text)
returns void
language plpgsql
as $$
declare v_count bigint;
begin
  if to_regclass(format('public.%I', p_table)) is null then return; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then return; end if;
  execute format($f$
    select coalesce(sum(c - 1), 0)
    from (
      select count(*) c
      from public.%I
      where %I is not null and btrim(%I::text) <> ''
      group by lower(btrim(%I::text))
      having count(*) > 1
    ) d$f$, p_table, p_column, p_column, p_column) into v_count;
  insert into inventory_quality values (p_table, 'DUPLICATE_NORMALIZED_' || upper(p_column), v_count, p_column);
end; $$;

-- Core identifiers and master names.
select pg_temp.add_null_check(t, c) from (values
  ('clusters','id'), ('clusters','name'),
  ('contractors','id'), ('contractors','name'),
  ('suppliers','id'), ('suppliers','name'),
  ('materials','id'), ('materials','name'),
  ('statuses','id'), ('statuses','label'),
  ('steel_diameters','id'), ('steel_diameters','diameter'),
  ('po_materials','id'), ('po_materials','register_no'),
  ('po_besi','id'), ('po_besi','register_no'),
  ('approvals','id'), ('approvals','register_no')
) x(t,c);

select pg_temp.add_blank_check(t, c) from (values
  ('clusters','name'), ('contractors','name'), ('suppliers','name'),
  ('materials','name'), ('statuses','label'), ('steel_diameters','diameter'),
  ('po_materials','register_no'), ('po_besi','register_no'), ('approvals','register_no')
) x(t,c);

select pg_temp.add_duplicate_check(t, c) from (values
  ('clusters','name'), ('contractors','name'), ('suppliers','name'),
  ('materials','name'), ('statuses','label'),
  ('po_materials','register_no'), ('po_besi','register_no'), ('approvals','register_no')
) x(t,c);

select table_name, check_name, affected_rows, detail
from inventory_quality
order by table_name, check_name;
