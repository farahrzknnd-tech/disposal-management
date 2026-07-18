/*
# Add catatan column to surat_jalan

1. Modified Tables
- `surat_jalan` - add `catatan` text column (nullable) to store notes from the
  Input Surat Jalan form.

2. Security
- No policy changes; the table already has anon + authenticated full CRUD.
*/

ALTER TABLE surat_jalan
  ADD COLUMN IF NOT EXISTS catatan text;
