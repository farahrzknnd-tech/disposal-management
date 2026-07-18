# Batch Workflow Fix

## Confirmed Root Cause
- `src/lib/batchService.ts` creates automatic batches with legacy status `Belum Dikirim`.
- `supabase/migrations/20260718090000_mvp_hardening.sql` only permits canonical statuses.
- Batch insert fails, error is swallowed, assignment returns an empty `Set`, and UI still shows success.
- Selected Surat Jalan never receive `batch_id`.

## Locked Business Flow
`Surat Jalan -> Assign to Batch -> Send Batch to QS -> Issue multiple SPKs by Cluster -> Submit Vendor Invoice -> Complete SPK -> Complete Batch`

## Status Transition Table
| Entity | From | To | Operation |
| --- | --- | --- | --- |
| Surat Jalan | `DRAFT` | `READY_FOR_QS` | Assign to automatic batch |
| Batch | `READY_FOR_QS` | `IN_QS_REVIEW` | Send to QS |
| Surat Jalan | `READY_FOR_QS` | `IN_QS_REVIEW` | Send batch to QS |
| SPK | none/`SPK_ISSUED` | `SPK_ISSUED` | Issue SPK per cluster |
| Batch | `IN_QS_REVIEW` | `SPK_ISSUED` | Only after every batch cluster has SPK |
| SPK | `SPK_ISSUED` | `INVOICED` | Submit vendor invoice |
| Batch | `SPK_ISSUED` | `INVOICED` | Only after all SPKs are at least invoiced/completed |
| SPK | `INVOICED` | `COMPLETED` | Complete SPK workflow |
| Batch | `INVOICED` | `COMPLETED` | Only after every SPK is completed |
| Any open batch | open status | `CANCELLED` | Cancel batch |

## Database Migration Plan
- Add unique batch-period constraint on `(periode_awal, periode_akhir)` after duplicate check.
- Add `assign_surat_jalan_to_auto_batches(uuid[])` RPC.
- Repair `send_batch_to_qs`, `issue_spk_for_batch_cluster`, `complete_spk_workflow`, `cancel_batch`.
- Add `submit_spk_invoice` RPC.
- Use Jakarta date: `(now() at time zone 'Asia/Jakarta')::date`.
- Keep grants to `authenticated`; revoke from `anon`.

## Frontend Change Plan
- Replace client-side batch assignment loop with one RPC wrapper.
- Keep selection after errors; clear only after confirmed assignments.
- Hide/disable write action for `VIEWER`.
- Use canonical status checks from `src/lib/status.ts`.
- Replace direct SPK/invoice/completion multi-table writes with RPC wrappers.
- Keep status labels presentation-only.

## Test Plan
- Unit-test batch period boundaries and timezone-safe date parsing.
- Unit-test canonical and legacy status mapping.
- Unit-test RPC wrapper error propagation.
- Unit-test assign result helpers for zero assignment and failure selection behavior.
- SQL migration documents database workflow expectations without requiring remote DB.

## Acceptance Criteria
- Assign selected unassigned Surat Jalan creates/reuses correct period batches.
- Success toast appears only when `assigned_count` equals requested count.
- Mixed periods report multiple affected batches.
- Send to QS requires `READY_FOR_QS` and non-empty batch.
- SPK issuance supports one SPK per cluster without prematurely setting batch `SPK_ISSUED`.
- Invoice submission sets `INVOICED`, not `COMPLETED`.
- Batch completes only when all SPKs complete.
