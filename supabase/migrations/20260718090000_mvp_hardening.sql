-- MVP hardening: auth profiles, roles, status normalization, RLS, audit, RPC workflows.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('ADMIN','OPERATOR','VIEWER'))
);

alter table public.profiles enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'VIEWER')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'ADMIN'
$$;

create or replace function public.is_operator_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('ADMIN','OPERATOR')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'VIEWER')
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.normalize_workflow_status(value text)
returns text
language sql
immutable
as $$
  select case coalesce(value, 'DRAFT')
    when 'Draft' then 'DRAFT'
    when 'Belum Dikirim' then 'READY_FOR_QS'
    when 'Dikirim ke QS' then 'IN_QS_REVIEW'
    when 'Proses QS' then 'IN_QS_REVIEW'
    when 'SPK Terbit' then 'SPK_ISSUED'
    when 'Tagihan' then 'INVOICED'
    when 'Tagihan Diserahkan' then 'INVOICED'
    when 'Finished' then 'COMPLETED'
    when 'Selesai' then 'COMPLETED'
    when 'DRAFT' then 'DRAFT'
    when 'READY_FOR_QS' then 'READY_FOR_QS'
    when 'IN_QS_REVIEW' then 'IN_QS_REVIEW'
    when 'SPK_ISSUED' then 'SPK_ISSUED'
    when 'INVOICED' then 'INVOICED'
    when 'COMPLETED' then 'COMPLETED'
    when 'CANCELLED' then 'CANCELLED'
    else 'DRAFT'
  end
$$;

update public.batch set status = public.normalize_workflow_status(status) where status is distinct from public.normalize_workflow_status(status);
update public.surat_jalan set status = public.normalize_workflow_status(status) where status is distinct from public.normalize_workflow_status(status);
update public.spk set status = public.normalize_workflow_status(status) where status is distinct from public.normalize_workflow_status(status);

alter table public.batch alter column status set default 'READY_FOR_QS';
alter table public.surat_jalan alter column status set default 'DRAFT';
alter table public.spk alter column status set default 'DRAFT';

do $$
begin
  alter table public.batch add constraint batch_status_check check (status in ('DRAFT','READY_FOR_QS','IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.surat_jalan add constraint surat_jalan_status_check check (status in ('DRAFT','READY_FOR_QS','IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.spk add constraint spk_status_check check (status in ('DRAFT','READY_FOR_QS','IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.surat_jalan add constraint surat_jalan_nonnegative_check check (pickup >= 0 and dam_truck >= 0 and harga >= 0 and total >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.spk add constraint spk_nonnegative_nominal_check check ((nominal_spk is null or nominal_spk >= 0) and (nominal_tagihan is null or nominal_tagihan >= 0));
exception when duplicate_object then null;
end $$;

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id uuid, p_old_value jsonb default null, p_new_value jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.audit_log (aktivitas, "user", tanggal)
  values (p_action || ' ' || p_entity_type || ' ' || coalesce(p_entity_id::text, ''), coalesce(v_email, auth.uid()::text), now());
exception when undefined_column then
  raise notice 'Audit table legacy shape detected; audit write skipped';
end;
$$;

create or replace function public.send_batch_to_qs(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.is_operator_or_admin() then raise exception 'Permission denied'; end if;
  select status into v_status from public.batch where id = p_batch_id for update;
  if v_status is null then raise exception 'Batch not found'; end if;
  if v_status not in ('READY_FOR_QS','DRAFT') then raise exception 'Invalid transition from %', v_status; end if;
  update public.batch set status = 'IN_QS_REVIEW', tanggal_kirim_qs = current_date where id = p_batch_id;
  update public.surat_jalan set status = 'IN_QS_REVIEW' where batch_id = p_batch_id;
  perform public.write_audit('SEND_TO_QS', 'batch', p_batch_id, jsonb_build_object('status', v_status), jsonb_build_object('status', 'IN_QS_REVIEW'));
  return jsonb_build_object('id', p_batch_id, 'status', 'IN_QS_REVIEW');
end;
$$;

create or replace function public.issue_spk_for_batch_cluster(p_batch_id uuid, p_cluster_id uuid, p_nomor_spk text default null, p_tanggal_spk date default null, p_nominal_spk numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_spk_id uuid; v_batch_status text;
begin
  if not public.is_operator_or_admin() then raise exception 'Permission denied'; end if;
  select status into v_batch_status from public.batch where id = p_batch_id for update;
  if v_batch_status <> 'IN_QS_REVIEW' then raise exception 'Batch must be IN_QS_REVIEW'; end if;
  insert into public.spk (batch_id, cluster_id, nomor_spk, tanggal_spk, nominal_spk, status)
  values (p_batch_id, p_cluster_id, p_nomor_spk, p_tanggal_spk, p_nominal_spk, 'SPK_ISSUED')
  on conflict (batch_id, cluster_id) do update set nomor_spk = excluded.nomor_spk, tanggal_spk = excluded.tanggal_spk, nominal_spk = excluded.nominal_spk, status = 'SPK_ISSUED', updated_at = now()
  returning id into v_spk_id;
  update public.surat_jalan set spk_id = v_spk_id, status = 'SPK_ISSUED' where batch_id = p_batch_id and cluster_id = p_cluster_id;
  update public.batch set status = 'SPK_ISSUED' where id = p_batch_id;
  perform public.write_audit('ISSUE_SPK', 'spk', v_spk_id, null, jsonb_build_object('status', 'SPK_ISSUED'));
  return jsonb_build_object('id', v_spk_id, 'status', 'SPK_ISSUED');
end;
$$;

create or replace function public.complete_spk_workflow(p_spk_id uuid, p_nomor_tagihan text default null, p_tanggal_tagihan date default null, p_nominal_tagihan numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_batch_id uuid; v_all_done boolean;
begin
  if not public.is_operator_or_admin() then raise exception 'Permission denied'; end if;
  update public.spk set nomor_tagihan = coalesce(p_nomor_tagihan, nomor_tagihan), tanggal_tagihan = coalesce(p_tanggal_tagihan, tanggal_tagihan), nominal_tagihan = coalesce(p_nominal_tagihan, nominal_tagihan), status = 'COMPLETED', updated_at = now()
  where id = p_spk_id and status in ('SPK_ISSUED','INVOICED') returning batch_id into v_batch_id;
  if v_batch_id is null then raise exception 'SPK not found or invalid transition'; end if;
  update public.surat_jalan set status = 'COMPLETED' where spk_id = p_spk_id;
  select bool_and(status = 'COMPLETED') into v_all_done from public.spk where batch_id = v_batch_id;
  if v_all_done then update public.batch set status = 'COMPLETED' where id = v_batch_id; end if;
  perform public.write_audit('COMPLETE_SPK', 'spk', p_spk_id, null, jsonb_build_object('status', 'COMPLETED'));
  return jsonb_build_object('id', p_spk_id, 'status', 'COMPLETED');
end;
$$;

create or replace function public.cancel_batch(p_batch_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operator_or_admin() then raise exception 'Permission denied'; end if;
  update public.batch set status = 'CANCELLED' where id = p_batch_id and status <> 'COMPLETED';
  if not found then raise exception 'Batch not found or cannot be cancelled'; end if;
  update public.surat_jalan set status = 'CANCELLED' where batch_id = p_batch_id;
  perform public.write_audit('CANCEL_BATCH', 'batch', p_batch_id, null, jsonb_build_object('status', 'CANCELLED', 'reason', p_reason));
  return jsonb_build_object('id', p_batch_id, 'status', 'CANCELLED');
end;
$$;

-- Replace unsafe broad policies. Names from Bolt migrations can differ; drop common permissive names defensively.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('master_cluster','master_kontraktor','master_vendor','surat_jalan','batch','spk','audit_log') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.master_cluster enable row level security;
alter table public.master_kontraktor enable row level security;
alter table public.master_vendor enable row level security;
alter table public.surat_jalan enable row level security;
alter table public.batch enable row level security;
alter table public.spk enable row level security;
alter table public.audit_log enable row level security;

create policy master_cluster_read on public.master_cluster for select to authenticated using (true);
create policy master_kontraktor_read on public.master_kontraktor for select to authenticated using (true);
create policy master_vendor_read on public.master_vendor for select to authenticated using (true);
create policy surat_jalan_read on public.surat_jalan for select to authenticated using (true);
create policy batch_read on public.batch for select to authenticated using (true);
create policy spk_read on public.spk for select to authenticated using (true);

create policy master_cluster_admin_write on public.master_cluster for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy master_kontraktor_admin_write on public.master_kontraktor for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy master_vendor_admin_write on public.master_vendor for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy surat_jalan_operator_write on public.surat_jalan for insert to authenticated with check (public.is_operator_or_admin());
create policy surat_jalan_operator_update on public.surat_jalan for update to authenticated using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());
create policy surat_jalan_admin_delete on public.surat_jalan for delete to authenticated using (public.is_admin());
create policy batch_operator_write on public.batch for insert to authenticated with check (public.is_operator_or_admin());
create policy batch_operator_update on public.batch for update to authenticated using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());
create policy batch_admin_delete on public.batch for delete to authenticated using (public.is_admin());
create policy spk_operator_write on public.spk for insert to authenticated with check (public.is_operator_or_admin());
create policy spk_operator_update on public.spk for update to authenticated using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());
create policy spk_admin_delete on public.spk for delete to authenticated using (public.is_admin());
create policy audit_log_admin_read on public.audit_log for select to authenticated using (public.is_admin());

grant execute on function public.send_batch_to_qs(uuid) to authenticated;
grant execute on function public.issue_spk_for_batch_cluster(uuid, uuid, text, date, numeric) to authenticated;
grant execute on function public.complete_spk_workflow(uuid, text, date, numeric) to authenticated;
grant execute on function public.cancel_batch(uuid, text) to authenticated;
