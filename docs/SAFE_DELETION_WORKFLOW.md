# Safe Deletion Workflow

## Why Orphan Batches Occurred
Surat Jalan rows could be deleted directly from the frontend while batch deletion was restricted to `READY_FOR_QS`. This left empty processed batches with stale statuses such as `COMPLETED`, sometimes with orphan SPKs.

## Surat Jalan Deletion
Allowed only for `ADMIN` through `delete_surat_jalan_safely(uuid[])` when:
- Surat Jalan is unassigned and `DRAFT`, or
- Surat Jalan belongs to a `READY_FOR_QS` batch and has no `spk_id`.

Rejected when status is `IN_QS_REVIEW`, `SPK_ISSUED`, `INVOICED`, `COMPLETED`, `CANCELLED`, when `spk_id` exists, when batch is not `READY_FOR_QS`, when IDs are missing, or caller is not `ADMIN`.

## Normal Batch Deletion
Allowed only for `ADMIN` through `delete_batch_safely(uuid)` when batch is `READY_FOR_QS` and has no SPK. Related Surat Jalan are released back to `DRAFT`.

## Empty Orphan Batch Cleanup
Allowed only for `ADMIN` when a batch has zero Surat Jalan, even if status is processed or cancelled. Related orphan SPKs are deleted in the same transaction. This is explicit cleanup, not automatic migration cleanup.

## Protected Historical Data
Processed non-empty batches remain protected. Their Surat Jalan and SPKs preserve auditability and workflow history.

## RPC Definitions
- `delete_surat_jalan_safely(p_surat_jalan_ids uuid[]) returns jsonb`
- `delete_batch_safely(p_batch_id uuid) returns jsonb`

## RLS Restrictions
Direct `DELETE` policies on `surat_jalan`, `batch`, and `spk` are removed. Browser clients must use trusted RPCs. RPCs verify `auth.uid()` and `public.is_admin()` from database profile data.

## Orphan Diagnostic Query
```sql
select b.id, b.nama_batch, b.status,
       count(distinct sj.id) as surat_jalan_count,
       count(distinct s.id) as spk_count
from public.batch b
left join public.surat_jalan sj on sj.batch_id = b.id
left join public.spk s on s.batch_id = b.id
group by b.id, b.nama_batch, b.status
having count(distinct sj.id) = 0;
```

## Manual Testing
- Delete unassigned `DRAFT` Surat Jalan as ADMIN.
- Delete a `READY_FOR_QS` batch with Surat Jalan and verify rows return to `DRAFT`.
- Delete empty `COMPLETED` batch and verify orphan SPKs are removed.
- Verify non-empty `COMPLETED` batch cannot be deleted.

## Remote Migration
Run manually:

```bash
npx supabase db push
```

## Known Limitations
No restore/undo workflow. Cleanup of existing orphan batches is explicit per batch from the UI.
