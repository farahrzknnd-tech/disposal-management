# Procurement Schema Reconstruction

## 1. Tujuan

Dokumen ini merekonstruksi kontrak data `po-archive` berdasarkan source code yang tersedia. Repository legacy tidak memiliki baseline migration lengkap; tiga migration yang tersedia hanya mengubah tabel existing.

Hasil reconstruction ini menjadi input untuk migration baru di `disposal-management`, bukan migration yang dijalankan langsung.

## 2. Sumber Pemeriksaan

- `po-archive/lib/types.ts`;
- form PO Material, PO Besi, dan Approval;
- hook CRUD/master data;
- query Supabase pada pages/components;
- helper register, status, steel, export, dan activity;
- migration tambahan legacy;
- schema dan role existing `disposal-management`.

## 3. Inventaris Tabel Legacy

| Tabel Legacy | Digunakan oleh | Status baseline | Target |
|---|---|---|---|
| `clusters` | semua modul PO | Tidak tersedia | map ke `master_cluster` |
| `contractors` | PO, approval, quota | Tidak tersedia | map ke `master_kontraktor` |
| `suppliers` | PO Material/Besi | Tidak tersedia | `procurement_suppliers` |
| `materials` | approval/master | Tidak tersedia | `procurement_materials` |
| `statuses` | seluruh status UI | Tidak tersedia | `procurement_statuses` |
| `steel_diameters` | PO Besi | Tidak tersedia | `procurement_steel_diameters` |
| `steel_quotas` | quota page | Tidak tersedia | `procurement_steel_quotas` |
| `po_materials` | PO Material | Tidak tersedia | `procurement_po_materials` |
| `po_material_items` | detail PO Material | Tidak tersedia | `procurement_po_material_items` |
| `po_besi` | PO Besi | Tidak tersedia | `procurement_po_steel` |
| `po_besi_items` | detail PO Besi | Tidak tersedia | `procurement_po_steel_items` |
| `approvals` | Approval Material | Tidak tersedia | `procurement_approvals` |
| `activities` | activity feed | Tidak tersedia | shared audit decision |

## 4. Field Mapping Master Data

### 4.1 Cluster

| PO Archive | Disposal Target | Transformasi |
|---|---|---|
| `clusters.id` | mapping only | legacy ID tidak dipertahankan sebagai shared PK kecuali import table menyimpan source ID |
| `clusters.name` | `master_cluster.nama_cluster` | trim + case-insensitive normalized match |
| `clusters.code` | belum ada field target | simpan mapping report; pertimbangkan field baru pada milestone database |
| `clusters.notes` | belum ada field target | tidak otomatis hilang; simpan import note/staging |

Keputusan mapping:

1. match exact normalized name;
2. bila tidak ada, cari code jika schema target telah ditambah code;
3. bila lebih dari satu kandidat, tandai ambiguous;
4. tidak otomatis membuat cluster production tanpa review;
5. unresolved cluster membuat record legacy tertahan atau `cluster_id = null` hanya jika bisnis mengizinkan.

### 4.2 Contractor

| PO Archive | Disposal Target | Transformasi |
|---|---|---|
| `contractors.name` | `master_kontraktor.nama_kontraktor` | normalized match |
| `contractors.contact` | `telepon` atau catatan | tidak boleh dipaksa bila berisi nama PIC; perlu review |
| `contractors.code` | field target belum ada | kandidat schema enhancement |
| `contractors.notes` | field target belum ada | staging/import notes |

Mapping tidak boleh hanya memakai substring. Exact normalized name atau approved manual mapping wajib.

### 4.3 Supplier

| Legacy | Target |
|---|---|
| `id` | new UUID + legacy mapping |
| `name` | `name` |
| `code` | `code` |
| `contact` | `contact` |
| `notes` | `notes` |

### 4.4 Material

| Legacy | Target |
|---|---|
| `name` | `name` |
| `category` | `category` |
| `notes` | `notes` |

Item PO Material yang hanya memiliki nama bebas tetap menyimpan `name_snapshot` walau master tidak ditemukan.

### 4.5 Status

| Legacy | Target |
|---|---|
| `label` | `label` |
| `category` | `category` |
| `module` | normalized module |

Legacy label awal yang ditemukan pada helper:

- Approved;
- Completed;
- Returned;
- Aman;
- Waiting QS;
- Waiting Design;
- Waiting Scan;
- In Progress;
- Review;
- Waiting;
- Draft;
- New Submission;
- Rejected;
- Over Quota;
- Overdue;
- Belum Lengkap.

Migration foundation harus membuat seed eksplisit dan code stabil, bukan menjadikan label sebagai business key.

### 4.6 Diameter Besi

| Legacy | Target |
|---|---|
| `diameter` | `label` |
| `diameter_mm` | `diameter_mm` |
| `coefficient` | `coefficient` |

Fallback legacy coefficients:

| Label | Coefficient |
|---|---:|
| Ø8 | 4740 |
| Ø10 | 7404 |
| Ø12 | 10656 |
| Ø13 | 12504 |
| Ø16 | 18936 |
| Ø19 | 26712 |
| Ø22 | 35808 |
| Ø25 | 46236 |

Nilai tersebut harus diverifikasi terhadap data remote dan rumus bisnis sebelum seed final.

## 5. Field Mapping Transaction Data

### 5.1 PO Material

| Legacy `po_materials` | Target `procurement_po_materials` | Rule |
|---|---|---|
| `id` | `legacy_source_id` pada staging/map | jangan pakai sebagai target PK tanpa alasan |
| `register_no` | `register_no` | preserve, unique validation |
| `receive_date` | `receive_date` | ISO date |
| `cluster_id` | `cluster_id` | mapping master |
| `contractor_id` | `contractor_id` | mapping master |
| `supplier_id` | `supplier_id` | mapping supplier |
| `po_no` | `po_no` | trim |
| `po_date` | `po_date` | ISO date |
| `status` | `status_id` | map by code/normalized label |
| `return_date` | `return_date` | ISO date |
| `drive_link` | `drive_link` | validate URL; preserve invalid as review issue |
| `jenis_material` | `material_type` | preserve |
| `notes` | `notes` | preserve |
| timestamps | timestamps | preserve where valid |

### 5.2 PO Material Item

| Legacy | Target | Rule |
|---|---|---|
| `name` | `name_snapshot` | required after trim |
| `brand` | `brand` | preserve |
| `specification` | `specification` | preserve |
| `qty` | `quantity` | decimal >= 0 |
| `unit` | `unit` | preserve |
| `notes` | `notes` | preserve |
| item order | `sequence_no` | derive from source order |

Material master matching bersifat opsional dan tidak boleh mengubah snapshot.

### 5.3 PO Besi

| Legacy `po_besi` | Target `procurement_po_steel` |
|---|---|
| `register_no` | `register_no` |
| `receive_date` | `receive_date` |
| `cluster_id` | mapped `cluster_id` |
| `contractor_id` | mapped `contractor_id` |
| supplier field dari migration legacy | `supplier_id` |
| `po_no` | `po_no` |
| `po_date` | `po_date` |
| `status` | `status_id` |
| `return_date` | `return_date` |
| `memo_qs_no` | `memo_qs_no` |
| `memo_date` | `memo_date` |
| `drive_po_link` | `drive_po_link` |
| `drive_memo_link` | `drive_memo_link` |
| `notes` | `notes` |

### 5.4 PO Besi Item

| Legacy | Target | Rule |
|---|---|---|
| `diameter` | `diameter_snapshot` | preserve |
| `diameter_id` | mapped `diameter_id` | validate existence |
| `jumlah_batang` | `bar_count` | integer >= 0 |
| `coefficient` | `coefficient_snapshot` | preserve and verify |
| `berat_kg` | `weight_kg` | compare with calculated value |
| `notes` | `notes` | preserve |

Import report harus menandai perbedaan antara legacy `berat_kg` dan recalculation melebihi tolerance yang disepakati.

### 5.5 Approval

| Legacy `approvals` | Target `procurement_approvals` |
|---|---|
| `register_no` | `register_no` |
| `doc_type` | `document_type` |
| `date` | `document_date` |
| `submit_date` | `submit_date` |
| `review_date` | `review_date` |
| `approve_date` | `approve_date` |
| `return_date` | `return_date` |
| `approver` | `approver` |
| `cluster_id` | mapped cluster |
| `contractor_id` | mapped contractor |
| `material_name` | `material_name_snapshot` |
| `brand` | `brand` |
| `status` | mapped status |
| `scan_date` | `scan_date` |
| `drive_link` | `drive_link` |
| `tags` | `tags` |
| `category` | `category` |
| `notes` | `notes` |

### 5.6 Steel Quota

| Legacy `steel_quotas` | Target `procurement_steel_quotas` |
|---|---|
| `contractor_id` | mapped contractor |
| `cluster_id` | mapped cluster nullable |
| `quota_kg` | `quota_kg` |
| `waste_percent` | `waste_percent` |
| `notes` | `notes` |

Derived `sudahDiajukan`, `sisaKuota`, `percentUsed`, `status`, dan `poCount` tidak diimport sebagai source of truth; semuanya dihitung ulang.

## 6. Data Profiling yang Wajib Diambil dari Supabase Legacy

Sebelum migration import dibuat, jalankan inventaris read-only pada database PO Archive:

- jumlah row per tabel;
- daftar kolom dan tipe aktual;
- primary/foreign keys;
- unique constraints;
- indexes;
- RLS policies dan grants;
- function/RPC;
- duplicate register numbers;
- null rate per required field;
- orphan item rows;
- status values aktual;
- distinct unit/material type;
- duplicate cluster/contractor names;
- invalid URL/date;
- steel calculation mismatch;
- total PO per year;
- max sequence per prefix/year.

Contoh query inventaris aman:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

Hasil profiling harus disimpan di luar production secrets dan dilampirkan pada fase import.

## 7. Strategi Data Migration

### 7.1 Tahapan

1. backup kedua Supabase project;
2. freeze perubahan schema PO Archive;
3. export legacy ke file terkontrol;
4. load ke staging/import tables, bukan langsung ke target;
5. normalisasi nama/code;
6. buat mapping master;
7. jalankan dry-run validation;
8. export unresolved/ambiguous rows;
9. review manual;
10. import master baru;
11. import transaction parent;
12. import child items;
13. import quotas;
14. reconcile count, totals, register, and weights;
15. business verification UI;
16. cutover PO Archive menjadi read-only;
17. retain fallback sampai sign-off.

### 7.2 Idempotency

Import harus dapat dijalankan ulang tanpa duplikasi menggunakan kombinasi:

- source system;
- legacy source ID;
- unique register number;
- import run ID.

Disarankan tabel:

```text
procurement_import_runs
procurement_legacy_id_map
procurement_import_issues
```

### 7.3 Kebijakan Record Tidak Terpetakan

- master ambiguous: jangan import transaction;
- master missing tetapi field optional: boleh null hanya setelah review;
- required field invalid: skip dan issue;
- duplicate register: skip atau manual merge, tidak overwrite;
- orphan item: issue;
- amount/weight mismatch: import ditahan atau explicit accepted snapshot;
- invalid URL: preserve raw di staging, bukan target tanpa keputusan.

## 8. Reconciliation Checklist

Setelah import:

- row count parent per module sama dengan accepted legacy count;
- item count sama;
- total weight PO Besi dibandingkan;
- quota used dan remaining dibandingkan;
- status distribution dibandingkan;
- register number uniqueness lulus;
- semua FK valid;
- tidak ada orphan items;
- RLS anonymous ditolak;
- viewer tidak dapat mutate;
- operator workflow sesuai;
- admin master CRUD sesuai;
- export sample dibandingkan;
- random sample minimal 10 record per modul diverifikasi manual.

## 9. Open Verification Items

Belum dapat dikunci hanya dari ZIP:

1. schema remote aktual PO Archive;
2. apakah supplier sudah benar-benar tersimpan pada `po_besi` dan nama kolom aktual;
3. foreign-key delete behavior legacy;
4. register number aktual Approval;
5. apakah `activities` memiliki actor user;
6. tolerance mismatch perhitungan berat;
7. data `contact` contractor berupa telepon atau PIC;
8. code uniqueness pada master;
9. jumlah data production yang harus dipindahkan.

Item tersebut wajib dijawab oleh Phase 1B read-only remote schema export sebelum Patch Database Foundation.

## 13. Phase 1B Remote Verification

Reconstruction pada dokumen ini berasal dari source code dan migration parsial. Remote verification harus dilakukan menggunakan toolkit:

```text
scripts/procurement-inventory/
```

Hasil remote mempunyai prioritas lebih tinggi daripada interface TypeScript bila ditemukan perbedaan.

Aturan resolusi:

1. remote database adalah evidence kondisi legacy aktual;
2. source code menjelaskan cara data digunakan;
3. migration parsial menjelaskan evolusi schema;
4. target schema tetap dirancang ulang mengikuti keamanan host, bukan menyalin remote;
5. perbedaan wajib dicatat sebelum Patch 2 dibuat.

Decision gate dan evidence matrix tersedia di:

```text
docs/procurement/PROCUREMENT_REMOTE_SCHEMA_INVENTORY.md
```
