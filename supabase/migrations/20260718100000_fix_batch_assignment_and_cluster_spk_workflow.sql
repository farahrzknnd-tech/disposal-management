-- Fix Surat Jalan -> Batch -> QS -> multi-cluster SPK -> Invoice -> Completion workflow.

create or replace function public.jakarta_today()
returns date
language sql
stable
set search_path = public
as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

create or replace function public.batch_period_for_date(p_date date)
returns table(periode_awal date, periode_akhir date, segment int)
language sql
immutable
set search_path = public
as $$
  select
    make_date(extract(year from p_date)::int, extract(month from p_date)::int, case when extract(day from p_date)::int <= 15 then 1 else 16 end),
    make_date(extract(year from p_date)::int, extract(month from p_date)::int, case when extract(day from p_date)::int <= 15 then 15 else extract(day from (date_trunc('month', p_date)::date + interval '1 month - 1 day'))::int end),
    case when extract(day from p_date)::int <= 15 then 1 else 2 end
$$;

create or replace function public.batch_name_for_period(p_periode_awal date, p_segment int)
returns text
language sql
immutable
set search_path = public
as $$
  select 'Batch ' || case extract(month from p_periode_awal)::int
    when 1 then 'Januari' when 2 then 'Februari' when 3 then 'Maret' when 4 then 'April'
    when 5 then 'Mei' when 6 then 'Juni' when 7 then 'Juli' when 8 then 'Agustus'
    when 9 then 'September' when 10 then 'Oktober' when 11 then 'November' else 'Desember' end
    || ' ' || case when p_segment = 1 then 'I' else 'II' end || ' ' || extract(year from p_periode_awal)::int
$$;

do $$
begin
  if exists (
    select 1 from public.batch
    where periode_awal is not null and periode_akhir is not null
    group by periode_awal, periode_akhir
    having count(*) > 1
  ) then
    raise exception 'Duplicate batch periods exist. Merge duplicates before applying unique constraint.';
  end if;
  alter table public.batch add constraint batch_unique_period unique (periode_awal, periode_akhir);
exception when duplicate_object then null;
end $$;

create or replace function public.refresh_batch_workflow_status(p_batch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_cluster_count int;
  v_spk_count int;
  v_invoiced_count int;
  v_completed_count int;
begin
  select status into v_status from public.batch where id = p_batch_id for update;
  if v_status is null then raise exception 'Batch not found'; end if;
  if v_status = 'CANCELLED' then return v_status; end if;

  select count(distinct cluster_id) into v_cluster_count from public.surat_jalan where batch_id = p_batch_id and cluster_id is not null;
  select count(*) filter (where status in ('SPK_ISSUED','INVOICED','COMPLETED')),
         count(*) filter (where status in ('INVOICED','COMPLETED')),
         count(*) filter (where status = 'COMPLETED')
    into v_spk_count, v_invoiced_count, v_completed_count
  from public.spk where batch_id = p_batch_id;

  if v_cluster_count > 0 and v_spk_count = v_cluster_count and v_completed_count = v_cluster_count then
    update public.batch set status = 'COMPLETED' where id = p_batch_id;
    update public.surat_jalan set status = 'COMPLETED' where batch_id = p_batch_id;
    return 'COMPLETED';
  elsif v_cluster_count > 0 and v_spk_count = v_cluster_count and v_invoiced_count = v_cluster_count then
    update public.batch set status = 'INVOICED' where id = p_batch_id;
    return 'INVOICED';
  elsif v_cluster_count > 0 and v_spk_count = v_cluster_count then
    update public.batch set status = 'SPK_ISSUED' where id = p_batch_id;
    return 'SPK_ISSUED';
  end if;

  return v_status;
end;
$$;

create or replace function public.assign_surat_jalan_to_auto_batches(p_surat_jalan_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_count int;
  v_found_count int;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Anda harus login untuk melakukan assign.'; end if;
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin untuk melakukan assign.'; end if;
  select count(distinct id) into v_requested_count from unnest(coalesce(p_surat_jalan_ids, array[]::uuid[])) as id;
  if v_requested_count = 0 then raise exception 'Pilih minimal satu Surat Jalan.'; end if;

  create temp table tmp_assign_sj on commit drop as
    select sj.*, p.periode_awal, p.periode_akhir, p.segment
    from public.surat_jalan sj
    join unnest(p_surat_jalan_ids) ids(id) on ids.id = sj.id
    cross join lateral public.batch_period_for_date(sj.tanggal::date) p
    for update of sj;

  select count(*) into v_found_count from tmp_assign_sj;
  if v_found_count <> v_requested_count then raise exception 'Sebagian Surat Jalan tidak ditemukan.'; end if;
  if exists (select 1 from tmp_assign_sj where batch_id is not null) then raise exception 'Surat Jalan sudah berada di batch.'; end if;
  if exists (select 1 from tmp_assign_sj where status in ('IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED')) then raise exception 'Surat Jalan sudah tertutup dan tidak dapat diassign.'; end if;

  create temp table tmp_assign_batches on commit drop as
    select distinct periode_awal, periode_akhir, segment from tmp_assign_sj;

  insert into public.batch (nama_batch, periode_awal, periode_akhir, status)
  select public.batch_name_for_period(periode_awal, segment), periode_awal, periode_akhir, 'READY_FOR_QS'
  from tmp_assign_batches
  on conflict (periode_awal, periode_akhir) do nothing;

  if exists (
    select 1 from tmp_assign_batches p
    join public.batch b on b.periode_awal = p.periode_awal and b.periode_akhir = p.periode_akhir
    where b.status <> 'READY_FOR_QS'
  ) then
    raise exception 'Batch sudah dikirim ke QS dan tidak dapat menerima Surat Jalan baru.';
  end if;

  update public.surat_jalan sj
  set batch_id = b.id,
      tanggal_batch = public.jakarta_today(),
      status = 'READY_FOR_QS'
  from tmp_assign_sj t
  join public.batch b on b.periode_awal = t.periode_awal and b.periode_akhir = t.periode_akhir
  where sj.id = t.id;

  select jsonb_build_object(
    'requested_count', v_requested_count,
    'assigned_count', count(*),
    'batches', coalesce(jsonb_agg(jsonb_build_object('batch_id', batch_id, 'nama_batch', nama_batch, 'assigned_count', assigned_count) order by nama_batch), '[]'::jsonb)
  ) into v_result
  from (
    select b.id batch_id, b.nama_batch, count(*) assigned_count
    from tmp_assign_sj t
    join public.batch b on b.periode_awal = t.periode_awal and b.periode_akhir = t.periode_akhir
    group by b.id, b.nama_batch
  ) x;

  perform public.write_audit('ASSIGN_TO_BATCH', 'surat_jalan', null, null, v_result);
  return v_result;
end;
$$;

create or replace function public.send_batch_to_qs(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin mengirim batch.'; end if;
  perform 1 from public.batch where id = p_batch_id and status = 'READY_FOR_QS' for update;
  if not found then raise exception 'Batch hanya dapat dikirim ke QS dari status READY_FOR_QS.'; end if;
  select count(*) into v_count from public.surat_jalan where batch_id = p_batch_id;
  if v_count = 0 then raise exception 'Batch tidak memiliki Surat Jalan.'; end if;
  update public.batch set status = 'IN_QS_REVIEW', tanggal_kirim_qs = public.jakarta_today() where id = p_batch_id;
  update public.surat_jalan set status = 'IN_QS_REVIEW' where batch_id = p_batch_id;
  perform public.write_audit('SEND_TO_QS', 'batch', p_batch_id, null, jsonb_build_object('status', 'IN_QS_REVIEW', 'surat_jalan_count', v_count));
  return jsonb_build_object('batch_id', p_batch_id, 'status', 'IN_QS_REVIEW', 'surat_jalan_count', v_count);
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
  on conflict (batch_id, cluster_id) do update set
    nomor_spk = excluded.nomor_spk,
    tanggal_spk = excluded.tanggal_spk,
    nominal_spk = excluded.nominal_spk,
    status = 'SPK_ISSUED',
    updated_at = now()
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
  update public.spk
  set nomor_tagihan = p_nomor_tagihan,
      tanggal_tagihan = p_tanggal_tagihan,
      nominal_tagihan = p_nominal_tagihan,
      catatan = p_catatan,
      status = 'INVOICED',
      updated_at = now()
  where id = p_spk_id and status = 'SPK_ISSUED'
  returning batch_id into v_batch_id;
  if v_batch_id is null then raise exception 'SPK hanya dapat ditagihkan dari status SPK_ISSUED.'; end if;
  update public.surat_jalan set status = 'INVOICED' where spk_id = p_spk_id;
  v_batch_status := public.refresh_batch_workflow_status(v_batch_id);
  perform public.write_audit('SUBMIT_INVOICE', 'spk', p_spk_id, null, jsonb_build_object('status', 'INVOICED', 'batch_status', v_batch_status));
  return jsonb_build_object('spk_id', p_spk_id, 'status', 'INVOICED', 'batch_status', v_batch_status);
end;
$$;

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
  where id = p_spk_id and status = 'INVOICED'
  returning batch_id into v_batch_id;
  if v_batch_id is null then raise exception 'SPK hanya dapat diselesaikan dari status INVOICED.'; end if;
  update public.surat_jalan set status = 'COMPLETED' where spk_id = p_spk_id;
  v_batch_status := public.refresh_batch_workflow_status(v_batch_id);
  perform public.write_audit('COMPLETE_SPK', 'spk', p_spk_id, null, jsonb_build_object('status', 'COMPLETED', 'batch_status', v_batch_status));
  return jsonb_build_object('spk_id', p_spk_id, 'status', 'COMPLETED', 'batch_status', v_batch_status);
end;
$$;

create or replace function public.cancel_batch(p_batch_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operator_or_admin() then raise exception 'Anda tidak memiliki izin membatalkan batch.'; end if;
  perform 1 from public.batch where id = p_batch_id and status in ('READY_FOR_QS','IN_QS_REVIEW') for update;
  if not found then raise exception 'Batch tidak dapat dibatalkan dari status saat ini.'; end if;
  update public.batch set status = 'CANCELLED' where id = p_batch_id;
  update public.surat_jalan set status = 'CANCELLED' where batch_id = p_batch_id;
  update public.spk set status = 'CANCELLED', updated_at = now() where batch_id = p_batch_id;
  perform public.write_audit('CANCEL_BATCH', 'batch', p_batch_id, null, jsonb_build_object('status', 'CANCELLED', 'reason', p_reason));
  return jsonb_build_object('batch_id', p_batch_id, 'status', 'CANCELLED');
end;
$$;

revoke execute on function public.assign_surat_jalan_to_auto_batches(uuid[]) from anon;
revoke execute on function public.send_batch_to_qs(uuid) from anon;
revoke execute on function public.issue_spk_for_batch_cluster(uuid, uuid, text, date, numeric) from anon;
revoke execute on function public.submit_spk_invoice(uuid, text, date, numeric, text) from anon;
revoke execute on function public.complete_spk_workflow(uuid) from anon;
revoke execute on function public.cancel_batch(uuid, text) from anon;

grant execute on function public.assign_surat_jalan_to_auto_batches(uuid[]) to authenticated;
grant execute on function public.send_batch_to_qs(uuid) to authenticated;
grant execute on function public.issue_spk_for_batch_cluster(uuid, uuid, text, date, numeric) to authenticated;
grant execute on function public.submit_spk_invoice(uuid, text, date, numeric, text) to authenticated;
grant execute on function public.complete_spk_workflow(uuid) to authenticated;
grant execute on function public.cancel_batch(uuid, text) to authenticated;
