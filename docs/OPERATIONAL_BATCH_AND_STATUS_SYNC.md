# Operational Batch And Status Sync

## Final Batch Definition
A batch represents one operational handover of Surat Jalan documents from Sabilillah that will be sent to QS together. A batch is not derived from the original Surat Jalan date.

## Why Not Surat Jalan Date-Based
A single handover can contain Surat Jalan dated April, May, June, and July. Splitting by original document date creates multiple batches that do not match QS handover reality.

## MVP Vendor Assumption
Sabilillah is the only operational vendor for this MVP. Batch creation does not ask for vendor.

## Two Batches Per Month
Each operational month normally has Batch I and Batch II. The operational month is stored as `batch.bulan_batch`, the first day of that month. The sequence is `batch.urutan_batch` with `1 = I` and `2 = II`.

## Schema Changes
- Add `batch.bulan_batch date`.
- Add `batch.urutan_batch smallint`.
- Add `batch.tanggal_diterima date`.
- Keep `periode_awal` and `periode_akhir` as informational Surat Jalan date coverage.
- Remove old unique constraint on `(periode_awal, periode_akhir)`.
- Add unique constraint on `(bulan_batch, urutan_batch)`.

## Existing Data Backfill
Migration strategy is deterministic:
1. Normalize existing batch status values.
2. Infer `bulan_batch` from `periode_awal`, then earliest Surat Jalan date, then `created_at`.
3. Infer `urutan_batch` from legacy name suffix or `periode_awal` day: days `1–15 = 1`, day `16+ = 2`.
4. Infer `tanggal_diterima` from minimum related `surat_jalan.tanggal_batch`, then `tanggal_kirim_qs`, then `created_at`.
5. Recalculate `periode_awal` and `periode_akhir` from min/max original `surat_jalan.tanggal`.
6. Abort if inferred `(bulan_batch, urutan_batch)` duplicates exist.

## Status Transitions
| Entity | Transition | Trigger |
| --- | --- | --- |
| Surat Jalan | `DRAFT -> READY_FOR_QS` | Assign to batch |
| Batch/SJ | `READY_FOR_QS -> IN_QS_REVIEW` | Send to QS |
| SPK/SJ | none or open -> `SPK_ISSUED` | Issue SPK per cluster |
| Batch | `IN_QS_REVIEW -> SPK_ISSUED` | Every batch cluster has SPK |
| SPK/SJ | `SPK_ISSUED -> INVOICED` | Submit invoice |
| Batch | `SPK_ISSUED -> INVOICED` | Every SPK at least invoiced/completed |
| SPK/SJ | `INVOICED -> COMPLETED` | Complete SPK |
| Batch/SJ | -> `COMPLETED` | Every SPK completed |
| Batch/SJ/SPK | -> `CANCELLED` | Supported cancellation |

## Monitoring Calculation
- Expected SPK count is `count(distinct surat_jalan.cluster_id)` inside each batch.
- Progress is `completed SPKs / expected batch clusters`, clamped `0–100`.
- Status displays persisted canonical batch status via `StatusBadge`.
- Master cluster count must not affect monitoring progress.

## Outstanding Calculation
For each SPK:
- `COMPLETED` contributes `0`.
- Non-completed uses `nominal_tagihan` when present.
- Otherwise uses `nominal_spk` when present.
- Otherwise uses `0`.

## RPC Descriptions
- `create_batch_and_assign_surat_jalan`: creates operational batch and assigns selected Surat Jalan atomically.
- `assign_surat_jalan_to_batch`: assigns selected Surat Jalan to existing `READY_FOR_QS` batch atomically.
- `delete_ready_batch`: ADMIN-only delete for `READY_FOR_QS` batch without SPK.
- `refresh_batch_workflow_status`: deterministic canonical batch status reconciliation.
- Existing QS/SPK/invoice/completion RPCs are updated to sync Surat Jalan statuses.

## UI Flow
1. Select unassigned Surat Jalan.
2. Click `Assign ke Batch`.
3. Choose eligible existing `READY_FOR_QS` batch or create a new operational batch.
4. Assign succeeds only when database confirms all selected rows changed.
5. Workflow mutations invalidate Surat Jalan, batch, SPK, monitoring, and dashboard query keys.

## Manual Test Scenarios
- Create `Batch Juli 2026 I` with `tanggal_diterima = 2026-07-15`.
- Assign Surat Jalan dated April, May, June, and July to the same batch.
- Send to QS, issue SPKs for CHELIA/VANICA/VIOLA, submit invoices, complete all SPKs.
- Verify batch/SJ/SPK statuses and Monitoring progress/outstanding.

## Remote Migration
Do not run against remote automatically. User applies manually:

```bash
npx supabase db push
```

## Known Limitations
- No scheduler for expected two batches/month.
- No vendor picker because Sabilillah is the MVP vendor assumption.
- Real Supabase generated types should be regenerated after migration.
