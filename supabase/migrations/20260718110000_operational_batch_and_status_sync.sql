-- Operational batch model and workflow status synchronization.

alter table public.batch add column if not exists bulan_batch date;
alter table public.batch add column if not exists urutan_batch smallint;
alter table public.batch add column if not exists tanggal_diterima date;

create or replace function public.operational_batch_name(p_bulan_batch date, p_urutan_batch smallint)
returns text
language sql
immutable
set search_path = public
as $$
  select 'Batch ' || case extract(month from p_bulan_batch)::int
    when 1 then 'Januari' when 2 then 'Februari' when 3 then 'Maret' when 4 then 'April'
    when 5 then 'Mei' when 6 then 'Juni' when 7 then 'Juli' when 8 then 'Agustus'
    when 9 then 'September' when 10 then 'Oktober' when 11 then 'November' else 'Desember' end
    || ' ' || extract(year from p_bulan_batch)::int
    || ' ' || case p_urutan_batch when 1 then 'I' when 2 then 'II' else '?' end
$$;

update public.batch b
set status = public.normalize_workflow_status(status)
where status is distinct from public.normalize_workflow_status(status);

update public.batch b
set periode_awal = x.min_tanggal,
    periode_akhir = x.max_tanggal
from (
  select batch_id, min(tanggal)::date min_tanggal, max(tanggal)::date max_tanggal
  from public.surat_jalan
  where batch_id is not null
  group by batch_id
) x
where b.id = x.batch_id;

update public.batch b
set bulan_batch = date_trunc('month', coalesce(b.periode_awal, x.min_tanggal, b.created_at::date))::date
from (
  select batch_id, min(tanggal)::date min_tanggal
  from public.surat_jalan
  where batch_id is not null
  group by batch_id
) x
where b.id = x.batch_id and b.bulan_batch is null;

update public.batch b
set bulan_batch = date_trunc('month', coalesce(b.periode_awal, b.created_at::date))::date
where b.bulan_batch is null;

update public.batch b
set urutan_batch = case
  when b.nama_batch ~* '\mII\M' then 2
  when extract(day from coalesce(b.periode_awal, b.created_at::date))::int >= 16 then 2
  else 1
end
where b.urutan_batch is null;

update public.batch b
set tanggal_diterima = coalesce(x.min_tanggal_batch, b.tanggal_kirim_qs, b.created_at::date)
from (
  select batch_id, min(tanggal_batch)::date min_tanggal_batch
  from public.surat_jalan
  where batch_id is not null and tanggal_batch is not null
  group by batch_id
) x
where b.id = x.batch_id and b.tanggal_diterima is null;

update public.batch b
set tanggal_diterima = coalesce(b.tanggal_kirim_qs, b.created_at::date)
where b.tanggal_diterima is null;

update public.batch
set nama_batch = public.operational_batch_name(bulan_batch, urutan_batch)
where bulan_batch is not null and urutan_batch in (1,2);

do $$
begin
  if exists (
    select 1 from public.batch
    group by bulan_batch, urutan_batch
    having count(*) > 1
  ) then
    raise exception 'Duplicate operational batches detected for bulan_batch + urutan_batch. Resolve duplicates manually before applying this migration.';
  end if;
end $$;

alter table public.batch drop constraint if exists batch_unique_period;

do $$
begin
  alter table public.batch add constraint batch_bulan_first_day_check check (bulan_batch = date_trunc('month', bulan_batch)::date);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.batch add constraint batch_urutan_batch_check check (urutan_batch in (1,2));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.batch add constraint batch_tanggal_diterima_not_null check (tanggal_diterima is not null);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.batch add constraint batch_unique_operational_sequence unique (bulan_batch, urutan_batch);
exception when duplicate_object then null;
end $$;

create or replace function public.recalculate_batch_coverage(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.batch b
  set periode_awal = x.min_tanggal,
      periode_akhir = x.max_tanggal
  from (
    select min(tanggal)::date min_tanggal, max(tanggal)::date max_tanggal
    from public.surat_jalan
    where batch_id = p_batch_id
  ) x
  where b.id = p_batch_id;
end;
$$;

create or replace function public.refresh_batch_workflow_status(p_batch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_has_sent boolean;
  v_cluster_count int;
  v_spk_count int;
  v_invoiced_count int;
  v_completed_count int;
  v_next_status text;
begin
  select status, tanggal_kirim_qs is not null into v_current_status, v_has_sent
  from public.batch where id = p_batch_id for update;
  if v_current_status is null then raise exception 'Batch not found'; end if;
  if v_current_status = 'CANCELLED' then return 'CANCELLED'; end if;

  select count(distinct cluster_id) into v_cluster_count
  from public.surat_jalan
  where batch_id = p_batch_id and cluster_id is not null;

  select count(*) filter (where status in ('SPK_ISSUED','INVOICED','COMPLETED')),
         count(*) filter (where status in ('INVOICED','COMPLETED')),
         count(*) filter (where status = 'COMPLETED')
  into v_spk_count, v_invoiced_count, v_completed_count
  from public.spk where batch_id = p_batch_id;

  if v_cluster_count > 0 and v_spk_count = v_cluster_count and v_completed_count = v_cluster_count then
    v_next_status := 'COMPLETED';
    update public.surat_jalan set status = 'COMPLETED' where batch_id = p_batch_id;
  elsif v_cluster_count > 0 and v_spk_count = v_cluster_count and v_invoiced_count = v_cluster_count then
    v_next_status := 'INVOICED';
  elsif v_cluster_count > 0 and v_spk_count = v_cluster_count then
    v_next_status := 'SPK_ISSUED';
  elsif v_has_sent then
    v_next_status := 'IN_QS_REVIEW';
  else
    v_next_status := 'READY_FOR_QS';
  end if;

  update public.batch set status = v_next_status where id = p_batch_id;
  return v_next_status;
end;
$$;

create or replace function public.assign_surat_jalan_to_batch(p_batch_id uuid, p_surat_jalan_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_count int;
  v_found_count int;
  v_batch record;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Anda harus login untuk melakukan assign.'; end if;
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin untuk melakukan assign.'; end if;
  select count(distinct id) into v_requested_count from unnest(coalesce(p_surat_jalan_ids, array[]::uuid[])) as id;
  if v_requested_count = 0 then raise exception 'Pilih minimal satu Surat Jalan.'; end if;

  select * into v_batch from public.batch where id = p_batch_id for update;
  if v_batch.id is null then raise exception 'Batch tidak ditemukan.'; end if;
  if v_batch.status <> 'READY_FOR_QS' then raise exception 'Batch sudah dikirim ke QS dan tidak dapat menerima Surat Jalan baru.'; end if;

  create temp table tmp_assign_sj on commit drop as
    select sj.* from public.surat_jalan sj
    join unnest(p_surat_jalan_ids) ids(id) on ids.id = sj.id
    for update of sj;

  select count(*) into v_found_count from tmp_assign_sj;
  if v_found_count <> v_requested_count then raise exception 'Sebagian Surat Jalan tidak ditemukan.'; end if;
  if exists (select 1 from tmp_assign_sj where batch_id is not null) then raise exception 'Surat Jalan sudah berada di batch.'; end if;
  if exists (select 1 from tmp_assign_sj where status in ('IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED')) then raise exception 'Surat Jalan sudah tertutup dan tidak dapat diassign.'; end if;

  update public.surat_jalan sj
  set batch_id = p_batch_id,
      tanggal_batch = v_batch.tanggal_diterima,
      status = 'READY_FOR_QS'
  from tmp_assign_sj t
  where sj.id = t.id;

  perform public.recalculate_batch_coverage(p_batch_id);
  perform public.refresh_batch_workflow_status(p_batch_id);

  select jsonb_build_object(
    'batch_id', b.id,
    'nama_batch', b.nama_batch,
    'requested_count', v_requested_count,
    'assigned_count', v_found_count,
    'periode_awal', b.periode_awal,
    'periode_akhir', b.periode_akhir
  ) into v_result
  from public.batch b where b.id = p_batch_id;

  perform public.write_audit('ASSIGN_TO_BATCH', 'batch', p_batch_id, null, v_result);
  return v_result;
end;
$$;

create or replace function public.create_batch_and_assign_surat_jalan(
  p_bulan_batch date,
  p_urutan_batch smallint,
  p_tanggal_diterima date,
  p_catatan text,
  p_surat_jalan_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Anda harus login untuk membuat batch.'; end if;
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin membuat batch.'; end if;
  if p_bulan_batch is null or p_bulan_batch <> date_trunc('month', p_bulan_batch)::date then raise exception 'Bulan Batch harus tanggal pertama bulan.'; end if;
  if p_urutan_batch not in (1,2) then raise exception 'Urutan Batch harus I atau II.'; end if;
  if p_tanggal_diterima is null then raise exception 'Tanggal diterima wajib diisi.'; end if;
  if exists (select 1 from public.batch where bulan_batch = p_bulan_batch and urutan_batch = p_urutan_batch) then raise exception 'Batch bulan dan urutan tersebut sudah ada.'; end if;

  insert into public.batch (nama_batch, bulan_batch, urutan_batch, tanggal_diterima, status, catatan)
  values (public.operational_batch_name(p_bulan_batch, p_urutan_batch), p_bulan_batch, p_urutan_batch, p_tanggal_diterima, 'READY_FOR_QS', p_catatan)
  returning id into v_batch_id;

  v_result := public.assign_surat_jalan_to_batch(v_batch_id, p_surat_jalan_ids);
  perform public.write_audit('CREATE_BATCH_AND_ASSIGN', 'batch', v_batch_id, null, v_result);
  return v_result;
exception when others then
  raise;
end;
$$;

create or replace function public.delete_ready_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_batch record; v_released_count int;
begin
  if auth.uid() is null then raise exception 'Anda harus login untuk menghapus batch.'; end if;
  if not public.is_admin() then raise exception 'Hanya ADMIN yang dapat menghapus batch.'; end if;
  select * into v_batch from public.batch where id = p_batch_id for update;
  if v_batch.id is null then raise exception 'Batch tidak ditemukan.'; end if;
  if v_batch.status <> 'READY_FOR_QS' then raise exception 'Batch yang sudah diproses tidak dapat dihapus.'; end if;
  if exists (select 1 from public.spk where batch_id = p_batch_id) then raise exception 'Batch memiliki SPK dan tidak dapat dihapus.'; end if;

  update public.surat_jalan set batch_id = null, tanggal_batch = null, spk_id = null, status = 'DRAFT' where batch_id = p_batch_id;
  get diagnostics v_released_count = row_count;
  delete from public.batch where id = p_batch_id;
  perform public.write_audit('DELETE_READY_BATCH', 'batch', p_batch_id, to_jsonb(v_batch), jsonb_build_object('released_count', v_released_count));
  return jsonb_build_object('batch_id', p_batch_id, 'released_count', v_released_count);
end;
$$;

create or replace function public.send_batch_to_qs(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count int; v_status text;
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin mengirim batch.'; end if;
  perform 1 from public.batch where id = p_batch_id and status = 'READY_FOR_QS' for update;
  if not found then raise exception 'Batch hanya dapat dikirim ke QS dari status READY_FOR_QS.'; end if;
  select count(*) into v_count from public.surat_jalan where batch_id = p_batch_id;
  if v_count = 0 then raise exception 'Batch tidak memiliki Surat Jalan.'; end if;
  update public.batch set tanggal_kirim_qs = public.jakarta_today() where id = p_batch_id;
  update public.surat_jalan set status = 'IN_QS_REVIEW' where batch_id = p_batch_id;
  v_status := public.refresh_batch_workflow_status(p_batch_id);
  perform public.write_audit('SEND_TO_QS', 'batch', p_batch_id, null, jsonb_build_object('status', v_status, 'surat_jalan_count', v_count));
  return jsonb_build_object('batch_id', p_batch_id, 'status', v_status, 'surat_jalan_count', v_count);
end;
$$;

create or replace function public.issue_spk_for_batch_cluster(p_batch_id uuid, p_cluster_id uuid, p_nomor_spk text default null, p_tanggal_spk date default null, p_nominal_spk numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_spk_id uuid; v_batch_status text; v_batch_status_after text;
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin menerbitkan SPK.'; end if;
  select status into v_batch_status from public.batch where id = p_batch_id for update;
  if v_batch_status not in ('IN_QS_REVIEW','SPK_ISSUED') then raise exception 'Batch harus sudah dikirim ke QS.'; end if;
  if not exists (select 1 from public.surat_jalan where batch_id = p_batch_id and cluster_id = p_cluster_id) then raise exception 'Cluster tidak ditemukan dalam batch.'; end if;

  insert into public.spk (batch_id, cluster_id, nomor_spk, tanggal_spk, nominal_spk, status)
  values (p_batch_id, p_cluster_id, p_nomor_spk, p_tanggal_spk, p_nominal_spk, 'SPK_ISSUED')
  on conflict (batch_id, cluster_id) do update set nomor_spk = excluded.nomor_spk, tanggal_spk = excluded.tanggal_spk, nominal_spk = excluded.nominal_spk, status = 'SPK_ISSUED', updated_at = now()
  returning id into v_spk_id;

  update public.surat_jalan set spk_id = v_spk_id, status = 'SPK_ISSUED' where batch_id = p_batch_id and cluster_id = p_cluster_id;
  v_batch_status_after := public.refresh_batch_workflow_status(p_batch_id);
  perform public.write_audit('ISSUE_SPK', 'spk', v_spk_id, null, jsonb_build_object('status', 'SPK_ISSUED', 'batch_status', v_batch_status_after));
  return jsonb_build_object('spk_id', v_spk_id, 'status', 'SPK_ISSUED', 'batch_status', v_batch_status_after);
end;
$$;

create or replace function public.submit_spk_invoice(p_spk_id uuid, p_nomor_tagihan text, p_tanggal_tagihan date, p_nominal_tagihan numeric, p_catatan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_batch_id uuid; v_batch_status text;
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin menyimpan tagihan.'; end if;
  update public.spk set nomor_tagihan = p_nomor_tagihan, tanggal_tagihan = p_tanggal_tagihan, nominal_tagihan = p_nominal_tagihan, catatan = p_catatan, status = 'INVOICED', updated_at = now()
  where id = p_spk_id and status = 'SPK_ISSUED' returning batch_id into v_batch_id;
  if v_batch_id is null then raise exception 'SPK hanya dapat ditagihkan dari status SPK_ISSUED.'; end if;
  update public.surat_jalan set status = 'INVOICED' where spk_id = p_spk_id;
  v_batch_status := public.refresh_batch_workflow_status(v_batch_id);
  perform public.write_audit('SUBMIT_INVOICE', 'spk', p_spk_id, null, jsonb_build_object('status', 'INVOICED', 'batch_status', v_batch_status));
  return jsonb_build_object('spk_id', p_spk_id, 'status', 'INVOICED', 'batch_status', v_batch_status);
end;
$$;

drop function if exists public.complete_spk_workflow(uuid, text, date, numeric);
create or replace function public.complete_spk_workflow(p_spk_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_batch_id uuid; v_batch_status text;
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin menyelesaikan SPK.'; end if;
  update public.spk set status = 'COMPLETED', updated_at = now()
  where id = p_spk_id and status = 'INVOICED' returning batch_id into v_batch_id;
  if v_batch_id is null then raise exception 'SPK hanya dapat diselesaikan dari status INVOICED.'; end if;
  update public.surat_jalan set status = 'COMPLETED' where spk_id = p_spk_id;
  v_batch_status := public.refresh_batch_workflow_status(v_batch_id);
  perform public.write_audit('COMPLETE_SPK', 'spk', p_spk_id, null, jsonb_build_object('status', 'COMPLETED', 'batch_status', v_batch_status));
  return jsonb_build_object('spk_id', p_spk_id, 'status', 'COMPLETED', 'batch_status', v_batch_status);
end;
$$;

-- Reconcile existing linked statuses once.
update public.surat_jalan sj set status = spk.status
from public.spk spk
where sj.spk_id = spk.id and sj.status is distinct from spk.status and sj.status <> 'CANCELLED';

update public.surat_jalan sj set status = case
  when b.status = 'READY_FOR_QS' then 'READY_FOR_QS'
  when b.status = 'IN_QS_REVIEW' then 'IN_QS_REVIEW'
  when b.status = 'CANCELLED' then 'CANCELLED'
  else sj.status
end
from public.batch b
where sj.batch_id = b.id and sj.spk_id is null and sj.status <> 'CANCELLED';

update public.surat_jalan set status = public.normalize_workflow_status(status) where status is distinct from public.normalize_workflow_status(status);
update public.spk set status = public.normalize_workflow_status(status) where status is distinct from public.normalize_workflow_status(status);

do $$
declare r record;
begin
  for r in select id from public.batch loop
    perform public.refresh_batch_workflow_status(r.id);
  end loop;
end $$;

-- Retire old date-based auto assignment from browser callers.
revoke execute on function public.assign_surat_jalan_to_auto_batches(uuid[]) from public;
revoke execute on function public.assign_surat_jalan_to_auto_batches(uuid[]) from anon;
revoke execute on function public.assign_surat_jalan_to_auto_batches(uuid[]) from authenticated;

revoke execute on function public.assign_surat_jalan_to_batch(uuid, uuid[]) from public;
revoke execute on function public.create_batch_and_assign_surat_jalan(date, smallint, date, text, uuid[]) from public;
revoke execute on function public.delete_ready_batch(uuid) from public;
revoke execute on function public.refresh_batch_workflow_status(uuid) from public;
revoke execute on function public.send_batch_to_qs(uuid) from public;
revoke execute on function public.issue_spk_for_batch_cluster(uuid, uuid, text, date, numeric) from public;
revoke execute on function public.submit_spk_invoice(uuid, text, date, numeric, text) from public;
revoke execute on function public.complete_spk_workflow(uuid) from public;

grant execute on function public.assign_surat_jalan_to_batch(uuid, uuid[]) to authenticated;
grant execute on function public.create_batch_and_assign_surat_jalan(date, smallint, date, text, uuid[]) to authenticated;
grant execute on function public.delete_ready_batch(uuid) to authenticated;
grant execute on function public.send_batch_to_qs(uuid) to authenticated;
grant execute on function public.issue_spk_for_batch_cluster(uuid, uuid, text, date, numeric) to authenticated;
grant execute on function public.submit_spk_invoice(uuid, text, date, numeric, text) to authenticated;
grant execute on function public.complete_spk_workflow(uuid) to authenticated;
