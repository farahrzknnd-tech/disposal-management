/*
# Add spk_id to surat_jalan for SPK traceability

1. Changes
- Add `spk_id` (nullable uuid) to `surat_jalan` referencing `spk(id)`.
  A Surat Jalan may reference an SPK after the SPK is issued for its
  batch + cluster. Until then it stays null.
- Add index on `surat_jalan.spk_id` for quick lookups.

2. Security
- No new tables. RLS already enabled on `surat_jalan` and `spk`.
- Existing anon/authenticated policies continue to apply.

3. Notes
- `ON DELETE SET NULL` so deleting an SPK does not lose SJ data.
- The column is nullable so existing rows are unaffected.
*/

ALTER TABLE surat_jalan
  ADD COLUMN IF NOT EXISTS spk_id uuid REFERENCES spk(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_surat_jalan_spk_id ON surat_jalan(spk_id);
