/*
# Add catatan column to batch

1. Modified Tables
- `batch` - add `catatan` text column (nullable) to store notes for the Batch
  Pengiriman form.

2. Security
- No policy changes; the table already has anon + authenticated full CRUD.
*/

ALTER TABLE batch
  ADD COLUMN IF NOT EXISTS catatan text;
