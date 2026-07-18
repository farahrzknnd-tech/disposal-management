/*
# Add tanggal_batch column to surat_jalan

1. Modified Tables
- `surat_jalan` - add `tanggal_batch` date column (nullable) to record the date
  when the Surat Jalan was assigned to a Batch.

2. Security
- No policy changes; the table already has anon + authenticated full CRUD.
*/

ALTER TABLE surat_jalan
  ADD COLUMN IF NOT EXISTS tanggal_batch date;
