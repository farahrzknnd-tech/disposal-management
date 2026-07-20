# Procurement Legacy Remote Schema Inventory

## 1. Status Phase 1B

Phase 1B tidak mengubah database maupun aplikasi production. Fase ini menyediakan prosedur read-only untuk memperoleh fakta schema Supabase `po-archive` yang tidak tersedia di migration repository.

Repository legacy hanya memiliki tiga migration tambahan berbentuk `ALTER TABLE`; baseline yang membuat tabel utama tidak tersedia. Karena itu Patch 2 tidak boleh dibuat hanya dari TypeScript interface.

## 2. Tujuan

Inventaris harus mengunci:

- tabel dan kolom aktual;
- tipe, nullability, dan default;
- primary key, foreign key, unique, dan check constraint;
- index;
- RLS policies dan grants;
- function, trigger, dan sequence;
- jumlah row;
- duplicate dan missing identifier;
- orphan relationship;
- risiko kualitas data sebelum import.

## 3. Paket Query

Query tersedia di:

```text
scripts/procurement-inventory/
```

| File | Tujuan |
|---|---|
| `00_environment.sql` | versi PostgreSQL, schema, extensions |
| `01_tables_and_columns.sql` | kolom dan tabel yang hilang |
| `02_constraints_and_relationships.sql` | PK, FK, unique, check |
| `03_indexes.sql` | definisi dan statistik index |
| `04_rls_policies_and_grants.sql` | RLS, policy, table grants |
| `05_functions_triggers_sequences.sql` | function, trigger, sequence |
| `06_row_counts.sql` | exact count tanpa isi transaksi |
| `07_data_quality_profile.sql` | null, blank, duplicate normalized |
| `08_domain_reconciliation.sql` | orphan, header tanpa item, nilai negatif |

## 4. Cara Menjalankan

1. Buka project Supabase `po-archive`.
2. Masuk ke SQL Editor.
3. Jalankan query secara berurutan.
4. Export setiap result menjadi CSV.
5. Jangan mengubah SQL menjadi query mutation.
6. Jangan menjalankan query pada Supabase Disposal production.

Petunjuk lengkap ada di `scripts/procurement-inventory/README.md`.

## 5. Decision Gate menuju Patch 2

Patch 2 — Procurement Database Foundation hanya boleh dimulai setelah hasil minimum berikut tersedia:

- semua target table terkonfirmasi `PRESENT` atau `MISSING`;
- signature setiap kolom transaksi terkonfirmasi;
- foreign key legacy diketahui;
- format register number diketahui dari data agregat atau contoh yang sudah disamarkan;
- row count setiap tabel diketahui;
- duplicate normalized master diketahui;
- orphan child records diketahui;
- policy anonymous legacy diketahui;
- data import scope diputuskan: real data atau hanya schema/features.

## 6. Evidence Matrix

Isi tabel ini setelah query dijalankan.

| Area | Evidence | Status | Keputusan |
|---|---|---|---|
| Tables/columns | `01_tables_and_columns.csv` | Pending | — |
| Constraints/FK | `02_constraints_and_relationships.csv` | Pending | — |
| Indexes | `03_indexes.csv` | Pending | — |
| RLS/grants | `04_rls_policies_and_grants.csv` | Pending | — |
| Functions/triggers | `05_functions_triggers_sequences.csv` | Pending | — |
| Row counts | `06_row_counts.csv` | Pending | — |
| Data quality | `07_data_quality_profile.csv` | Pending | — |
| Reconciliation | `08_domain_reconciliation.csv` | Pending | — |

## 7. Schema Decisions yang Belum Boleh Diasumsikan

Sebelum inventory selesai, jangan mengunci berdasarkan tebakan:

- apakah `register_no` mempunyai unique constraint;
- apakah item header memakai cascade delete;
- apakah `status` berupa text atau FK;
- apakah berat besi dihitung oleh trigger atau frontend;
- apakah quota unik per contractor atau contractor+cluster;
- apakah supplier PO Besi telah terisi di data lama;
- apakah `diameter` string dan `diameter_id` selalu sinkron;
- apakah activities memiliki actor;
- apakah anonymous memiliki CRUD penuh pada seluruh tabel.

## 8. Security Review Gate

Bila hasil policy menunjukkan role `anon` mempunyai write access, itu hanya dicatat sebagai risiko legacy. Policy tersebut tidak boleh dipindahkan ke host.

Target host tetap:

| Role | Select | Transaction mutation | Master mutation |
|---|---:|---:|---:|
| ADMIN | Ya | Ya | Ya |
| OPERATOR | Ya | Ya | Tidak |
| VIEWER | Ya | Tidak | Tidak |
| anon | Tidak | Tidak | Tidak |

## 9. Output Phase 1B

Setelah CSV hasil inventory diperiksa, Phase 1B harus menghasilkan versi final dari:

- schema reconstruction yang sudah terverifikasi;
- legacy-to-target field mapping;
- unresolved mapping register;
- row-count reconciliation baseline;
- daftar data cleanup sebelum import;
- final contract untuk Patch 2.

Toolkit ini sendiri belum menyatakan remote schema sudah terverifikasi. Verifikasi baru selesai setelah output remote dijalankan dan ditinjau.
