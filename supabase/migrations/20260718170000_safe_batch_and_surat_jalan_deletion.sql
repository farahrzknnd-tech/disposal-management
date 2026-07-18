-- Safe deletion RPCs for Surat Jalan, ready batches, and empty orphan batches.

create or replace function public.delete_surat_jalan_safely(p_surat_jalan_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_count int;
  v_found_count int;
  v_deleted_count int;
  v_affected_batch_ids uuid[];
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Hanya ADMIN yang dapat menghapus data.'; end if;
  if not public.is_admin() then raise exception 'Hanya ADMIN yang dapat menghapus data.'; end if;

  select count(distinct id) into v_requested_count from unnest(coalesce(p_surat_jalan_ids, array[]::uuid[])) as id;
  if v_requested_count = 0 then raise exception 'Surat Jalan tidak ditemukan.'; end if;

  create temp table tmp_delete_sj on commit drop as
    select sj.*, b.status as batch_status
    from public.surat_jalan sj
    left join public.batch b on b.id = sj.batch_id
    join unnest(p_surat_jalan_ids) ids(id) on ids.id = sj.id
    for update of sj;

  select count(*) into v_found_count from tmp_delete_sj;
  if v_found_count = 0 then raise exception 'Surat Jalan tidak ditemukan.'; end if;
  if v_found_count <> v_requested_count then raise exception 'Sebagian Surat Jalan tidak ditemukan.'; end if;

  if exists (select 1 from tmp_delete_sj where spk_id is not null) then
    raise exception 'Surat Jalan yang sudah memiliki SPK tidak dapat dihapus.';
  end if;

  if exists (select 1 from tmp_delete_sj where public.normalize_workflow_status(status) in ('IN_QS_REVIEW','SPK_ISSUED','INVOICED','COMPLETED','CANCELLED')) then
    raise exception 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.';
  end if;

  if exists (
    select 1 from tmp_delete_sj
    where batch_id is null and public.normalize_workflow_status(status) <> 'DRAFT'
  ) then
    raise exception 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.';
  end if;

  if exists (
    select 1 from tmp_delete_sj
    where batch_id is not null and public.normalize_workflow_status(batch_status) <> 'READY_FOR_QS'
  ) then
    raise exception 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.';
  end if;

  select coalesce(array_agg(distinct batch_id) filter (where batch_id is not null), array[]::uuid[])
  into v_affected_batch_ids
  from tmp_delete_sj;

  delete from public.surat_jalan sj using tmp_delete_sj t where sj.id = t.id;
  get diagnostics v_deleted_count = row_count;

  if v_affected_batch_ids is not null then
    for i in 1..coalesce(array_length(v_affected_batch_ids, 1), 0) loop
      perform public.recalculate_batch_coverage(v_affected_batch_ids[i]);
      update public.batch set status = 'READY_FOR_QS' where id = v_affected_batch_ids[i] and not exists (select 1 from public.surat_jalan where batch_id = v_affected_batch_ids[i]);
      perform public.refresh_batch_workflow_status(v_affected_batch_ids[i]);
    end loop;
  end if;

  v_result := jsonb_build_object(
    'requested_count', v_requested_count,
    'deleted_count', v_deleted_count,
    'affected_batch_ids', coalesce(to_jsonb(v_affected_batch_ids), '[]'::jsonb)
  );
  perform public.write_audit('DELETE_SURAT_JALAN_SAFE', 'surat_jalan', null, null, v_result);
  return v_result;
end;
$$;

create or replace function public.delete_batch_safely(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch record;
  v_sj_count int;
  v_spk_count int;
  v_released_count int := 0;
  v_deleted_spk_count int := 0;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Hanya ADMIN yang dapat menghapus data.'; end if;
  if not public.is_admin() then raise exception 'Hanya ADMIN yang dapat menghapus data.'; end if;

  select * into v_batch from public.batch where id = p_batch_id for update;
  if v_batch.id is null then raise exception 'Batch tidak ditemukan.'; end if;

  select count(*) into v_sj_count from public.surat_jalan where batch_id = p_batch_id;
  select count(*) into v_spk_count from public.spk where batch_id = p_batch_id;

  if v_sj_count = 0 then
    delete from public.spk where batch_id = p_batch_id;
    get diagnostics v_deleted_spk_count = row_count;
    delete from public.batch where id = p_batch_id;
    v_result := jsonb_build_object(
      'batch_id', p_batch_id,
      'released_count', 0,
      'orphan_cleanup', true,
      'deleted_spk_count', v_deleted_spk_count,
      'batch_status', v_batch.status,
      'batch_name', v_batch.nama_batch
    );
    perform public.write_audit('DELETE_EMPTY_ORPHAN_BATCH', 'batch', p_batch_id, to_jsonb(v_batch), v_result);
    return v_result;
  end if;

  if public.normalize_workflow_status(v_batch.status) <> 'READY_FOR_QS' then
    raise exception 'Batch yang sudah diproses dan masih memiliki Surat Jalan tidak dapat dihapus.';
  end if;

  if v_spk_count > 0 then
    raise exception 'Batch memiliki data workflow aktif dan tidak dapat dihapus.';
  end if;

  update public.surat_jalan
  set batch_id = null,
      tanggal_batch = null,
      spk_id = null,
      status = 'DRAFT'
  where batch_id = p_batch_id;
  get diagnostics v_released_count = row_count;

  delete from public.batch where id = p_batch_id;

  v_result := jsonb_build_object(
    'batch_id', p_batch_id,
    'released_count', v_released_count,
    'orphan_cleanup', false,
    'deleted_spk_count', 0,
    'batch_status', v_batch.status,
    'batch_name', v_batch.nama_batch
  );
  perform public.write_audit('DELETE_READY_BATCH_SAFE', 'batch', p_batch_id, to_jsonb(v_batch), v_result);
  return v_result;
end;
$$;

-- Retire direct destructive policies; deletion must go through RPC validation.
drop policy if exists surat_jalan_admin_delete on public.surat_jalan;
drop policy if exists batch_admin_delete on public.batch;
drop policy if exists spk_admin_delete on public.spk;

revoke execute on function public.delete_ready_batch(uuid) from public;
revoke execute on function public.delete_ready_batch(uuid) from anon;
revoke execute on function public.delete_ready_batch(uuid) from authenticated;

revoke execute on function public.delete_surat_jalan_safely(uuid[]) from public;
revoke execute on function public.delete_surat_jalan_safely(uuid[]) from anon;
revoke execute on function public.delete_batch_safely(uuid) from public;
revoke execute on function public.delete_batch_safely(uuid) from anon;

grant execute on function public.delete_surat_jalan_safely(uuid[]) to authenticated;
grant execute on function public.delete_batch_safely(uuid) to authenticated;
notify pgrst, 'reload schema';
