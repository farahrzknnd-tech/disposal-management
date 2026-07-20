# PO Archive Legacy Remote Inventory Toolkit

Toolkit ini digunakan untuk membaca struktur dan kualitas data Supabase `po-archive` secara **read-only** sebelum membuat migration Procurement pada `disposal-management`.

## Prinsip keamanan

- Jalankan hanya pada project Supabase PO Archive.
- Jangan menjalankan query pada project Disposal Management production.
- Seluruh query dalam folder ini hanya `SELECT` atau blok transaksi yang diakhiri `ROLLBACK`.
- Jangan menyalin service-role key ke repository.
- Jangan menyertakan isi dokumen, link privat, nomor telepon, atau data sensitif dalam hasil yang dibagikan bila tidak diperlukan.

## Urutan eksekusi

Jalankan dari Supabase Dashboard PO Archive → SQL Editor:

1. `00_environment.sql`
2. `01_tables_and_columns.sql`
3. `02_constraints_and_relationships.sql`
4. `03_indexes.sql`
5. `04_rls_policies_and_grants.sql`
6. `05_functions_triggers_sequences.sql`
7. `06_row_counts.sql`
8. `07_data_quality_profile.sql`
9. `08_domain_reconciliation.sql`

Simpan setiap hasil sebagai CSV dengan nama yang sama, misalnya:

```text
00_environment.csv
01_tables_and_columns.csv
...
08_domain_reconciliation.csv
```

Letakkan hasil lokal di:

```text
docs/procurement/inventory-output/
```

Folder output diabaikan Git melalui `.gitignore`; hasil inventaris tidak boleh otomatis masuk repository karena mungkin mengandung metadata internal.

## Alternatif melalui psql

Jika memiliki database connection string read-only:

```bash
export PO_ARCHIVE_DB_URL='postgresql://...'

for file in scripts/procurement-inventory/*.sql; do
  name="$(basename "$file" .sql)"
  psql "$PO_ARCHIVE_DB_URL" \
    --set=ON_ERROR_STOP=1 \
    --csv \
    --file="$file" \
    > "docs/procurement/inventory-output/${name}.csv"
done
```

Gunakan user read-only bila tersedia. Jangan menyimpan `PO_ARCHIVE_DB_URL` di `.env` yang di-commit.

## Output minimum untuk review berikutnya

Kirimkan hasil berikut:

- daftar tabel/kolom;
- primary key dan foreign key;
- unique/check constraints;
- indexes;
- RLS policies dan grants;
- functions/triggers/sequences;
- row counts;
- data-quality summary;
- hasil reconciliation cluster dan contractor.

Tidak perlu mengirim seluruh row transaksi.
