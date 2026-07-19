-- Restore frontend deletion contract without reopening direct DELETE RLS.

create or replace function public.delete_surat_jalan(p_surat_jalan_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_deleted_count int;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login untuk menghapus surat jalan.';
  end if;
  if not public.is_admin() then
    raise exception 'Hanya ADMIN yang dapat menghapus surat jalan.';
  end if;

  select coalesce(array_agg(distinct id), array[]::uuid[])
  into v_ids
  from unnest(coalesce(p_surat_jalan_ids, array[]::uuid[])) as input(id)
  where id is not null;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Pilih minimal satu Surat Jalan untuk dihapus.';
  end if;

  delete from public.surat_jalan
  where id = any(v_ids);

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> array_length(v_ids, 1) then
    raise exception 'Sebagian Surat Jalan tidak ditemukan atau tidak dapat dihapus.';
  end if;

  perform public.write_audit(
    'DELETE_SURAT_JALAN',
    'surat_jalan',
    null,
    null,
    jsonb_build_object('deleted_count', v_deleted_count, 'ids', to_jsonb(v_ids))
  );

  return jsonb_build_object('deleted_count', v_deleted_count, 'ids', to_jsonb(v_ids));
end;
$$;

create or replace function public.delete_ready_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch record;
  v_released_count int;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login untuk menghapus batch.';
  end if;
  if not public.is_admin() then
    raise exception 'Hanya ADMIN yang dapat menghapus batch.';
  end if;

  select * into v_batch from public.batch where id = p_batch_id for update;
  if v_batch.id is null then
    raise exception 'Batch tidak ditemukan.';
  end if;
  if v_batch.status <> 'READY_FOR_QS' then
    raise exception 'Batch yang sudah diproses tidak dapat dihapus.';
  end if;
  if exists (select 1 from public.spk where batch_id = p_batch_id) then
    raise exception 'Batch memiliki SPK dan tidak dapat dihapus.';
  end if;

  update public.surat_jalan
  set batch_id = null, tanggal_batch = null, spk_id = null, status = 'DRAFT'
  where batch_id = p_batch_id;
  get diagnostics v_released_count = row_count;

  delete from public.batch where id = p_batch_id;

  perform public.write_audit(
    'DELETE_READY_BATCH',
    'batch',
    p_batch_id,
    to_jsonb(v_batch),
    jsonb_build_object('released_count', v_released_count)
  );

  return jsonb_build_object('batch_id', p_batch_id, 'released_count', v_released_count);
end;
$$;

revoke execute on function public.delete_surat_jalan(uuid[]) from public;
revoke execute on function public.delete_surat_jalan(uuid[]) from anon;
revoke execute on function public.delete_ready_batch(uuid) from public;
revoke execute on function public.delete_ready_batch(uuid) from anon;

grant execute on function public.delete_surat_jalan(uuid[]) to authenticated;
grant execute on function public.delete_ready_batch(uuid) to authenticated;
