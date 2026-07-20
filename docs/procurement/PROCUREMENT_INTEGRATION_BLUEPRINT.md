# Procurement Integration Blueprint

## 1. Ringkasan Eksekutif

`disposal-management` ditetapkan sebagai **host application** dan sumber standar teknis untuk integrasi fitur `po-archive`.

Integrasi dilakukan sebagai modul baru **Procurement**, bukan dengan menggabungkan dua source tree secara langsung. `po-archive` dipertahankan sementara sebagai referensi fitur dan sumber data legacy sampai seluruh modul Procurement, data, dan verifikasi produksi selesai.

Keputusan utama:

- aplikasi induk: `disposal-management`;
- framework final: React + Vite + React Router;
- authentication: Supabase Auth milik `disposal-management`;
- role: `ADMIN`, `OPERATOR`, `VIEWER`;
- Supabase project final: satu project milik `disposal-management`;
- master bersama: `master_cluster` dan `master_kontraktor`;
- master baru: supplier, material, status procurement, dan diameter besi;
- migration lama `po-archive` tidak dijalankan ke database host;
- import data legacy dilakukan terkontrol setelah modul baru stabil;
- production `disposal-management` tidak boleh terganggu selama fase integrasi.

## 2. Tujuan Produk

Aplikasi final mendukung dua domain operasional dalam satu shell:

```text
Project Operations Management System
├── Disposal Operations
│   ├── Surat Jalan
│   ├── Batch
│   ├── SPK
│   ├── Monitoring
│   └── Tagihan
└── Procurement Operations
    ├── PO Material
    ├── PO Besi
    ├── Approval Material
    ├── Kuota Besi
    └── Laporan Procurement
```

Manfaat untuk penggunaan pribadi:

- satu login dan satu deployment;
- satu master cluster dan kontraktor;
- pencarian dan laporan terintegrasi;
- biaya maintenance lebih rendah;
- tidak ada duplikasi data referensi;
- workflow kerja tidak terpecah di dua aplikasi.

## 3. Batas Domain

### 3.1 Domain Disposal

Tetap dimiliki oleh struktur existing:

- `surat_jalan`;
- `batch`;
- `spk`;
- `master_vendor`;
- workflow monitoring dan tagihan disposal.

Integrasi Procurement tidak boleh mengubah kontrak existing domain ini pada fase awal.

### 3.2 Domain Procurement

Modul baru memiliki tanggung jawab:

- PO Material;
- item PO Material;
- PO Besi;
- item diameter PO Besi;
- approval material;
- kuota besi;
- supplier;
- material;
- status procurement;
- diameter dan koefisien besi;
- laporan dan pencarian procurement;
- aktivitas procurement.

### 3.3 Shared Kernel

Data berikut digunakan bersama:

- Supabase Auth;
- `profiles`;
- `master_cluster`;
- `master_kontraktor`;
- `audit_log` atau audit infrastructure final;
- layout, navigation, toast, dialog, export helper, error handling, dan query client.

## 4. Keputusan Host Application

Komponen berikut dari `po-archive` **tidak dibawa**:

- `app/layout.tsx`;
- Next.js App Router;
- `components/sidebar.tsx`;
- `components/topbar.tsx`;
- `lib/supabase.ts`;
- auth configuration `persistSession: false`;
- `hooks/use-toast.ts`;
- duplikasi `components/ui/*`;
- `.env`;
- `next.config.js`;
- `netlify.toml`;
- migration history lama;
- generic CRUD tanpa domain boundary;
- raw backup/restore yang dapat melewati workflow.

Fitur bisnis `po-archive` akan di-port ke struktur host.

## 5. Struktur Source Target

```text
src/
├── features/
│   └── procurement/
│       ├── api/
│       │   ├── approvals.ts
│       │   ├── poMaterials.ts
│       │   ├── poSteel.ts
│       │   ├── quotas.ts
│       │   └── masterData.ts
│       ├── components/
│       │   ├── ApprovalForm.tsx
│       │   ├── PoMaterialForm.tsx
│       │   ├── PoSteelForm.tsx
│       │   ├── ProcurementFilters.tsx
│       │   ├── QuotaSummary.tsx
│       │   └── SteelItemsEditor.tsx
│       ├── pages/
│       │   ├── ApprovalList.tsx
│       │   ├── PoMaterialList.tsx
│       │   ├── PoSteelList.tsx
│       │   ├── ProcurementDashboard.tsx
│       │   ├── ProcurementReports.tsx
│       │   └── SteelQuotaList.tsx
│       ├── types/
│       ├── utils/
│       └── tests/
├── components/
│   ├── auth/
│   ├── common/
│   ├── layout/
│   └── ui/
└── lib/
    ├── auth.tsx
    ├── supabase.ts
    ├── database.types.ts
    └── export/
```

Aturan import:

- feature Procurement boleh menggunakan shared components dan shared libraries;
- domain Disposal tidak boleh mengimpor komponen internal Procurement;
- Procurement tidak boleh memanggil tabel melalui generic table-name API;
- mutation workflow harus memakai service/RPC yang eksplisit;
- UI tidak boleh menyimpan business rule yang hanya ada di client.

## 6. Route Final

Route tahap pertama mengikuti React Router existing dan tidak merombak app shell.

| Route | Halaman | Role baca | Role mutasi |
|---|---|---|---|
| `/procurement` | Dashboard Procurement | ADMIN, OPERATOR, VIEWER | — |
| `/procurement/po-material` | Daftar PO Material | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/po-material/new` | Tambah PO Material | — | ADMIN, OPERATOR |
| `/procurement/po-material/:id` | Detail PO Material | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/po-besi` | Daftar PO Besi | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/po-besi/new` | Tambah PO Besi | — | ADMIN, OPERATOR |
| `/procurement/po-besi/:id` | Detail PO Besi | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/approval` | Approval Material | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/quota-besi` | Kuota Besi | ADMIN, OPERATOR, VIEWER | ADMIN, OPERATOR |
| `/procurement/reports` | Laporan Procurement | ADMIN, OPERATOR, VIEWER | — |
| `/master-data/supplier` | Master Supplier | ADMIN | ADMIN |
| `/master-data/material` | Master Material | ADMIN | ADMIN |
| `/master-data/diameter-besi` | Master Diameter | ADMIN | ADMIN |
| `/master-data/status-procurement` | Master Status | ADMIN | ADMIN |

Sidebar tahap pertama:

```text
Dashboard

Disposal
- Surat Jalan
- Batch
- SPK
- Monitoring
- Tagihan

Procurement
- Dashboard Procurement
- PO Material
- PO Besi
- Approval Material
- Kuota Besi
- Laporan Procurement

Analytics
- Rekap Cluster
- Analisa
- Performance
- Laporan Disposal

Master Data
Audit Log
Pengaturan
```

## 7. Model Database Final

### 7.1 Shared Master Existing

#### `master_cluster`

Tetap menjadi sumber cluster untuk Disposal dan Procurement.

#### `master_kontraktor`

Tetap menjadi sumber kontraktor untuk Disposal dan Procurement.

Tidak dibuat tabel `clusters` atau `contractors` kedua.

### 7.2 `procurement_suppliers`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `code` | text | nullable, unique case-insensitive saat tidak null |
| `name` | text | not null, tidak boleh blank |
| `contact` | text | nullable |
| `phone` | text | nullable |
| `email` | text | nullable |
| `address` | text | nullable |
| `notes` | text | nullable |
| `status` | text | `Aktif` atau `Nonaktif` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Delete dibatasi jika telah dipakai PO.

### 7.3 `procurement_materials`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | nullable, unique saat tidak null |
| `name` | text | not null |
| `category` | text | nullable |
| `default_unit` | text | nullable |
| `notes` | text | nullable |
| `status` | text | `Aktif`/`Nonaktif` |
| timestamps | timestamptz | standard |

### 7.4 `procurement_statuses`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | unique, immutable setelah digunakan |
| `label` | text | not null |
| `category` | text | `green`, `yellow`, `red`, `blue` |
| `module` | text | `PO_MATERIAL`, `PO_BESI`, `APPROVAL`, atau `ALL` |
| `sort_order` | integer | >= 0 |
| `terminal` | boolean | default false |
| `active` | boolean | default true |
| timestamps | timestamptz | standard |

Status yang sudah digunakan dinonaktifkan, bukan dihapus.

### 7.5 `procurement_steel_diameters`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | unique, contoh `D08` |
| `label` | text | unique, contoh `Ø8` |
| `diameter_mm` | numeric(8,2) | > 0 |
| `coefficient` | numeric(18,6) | > 0 |
| `active` | boolean | default true |
| timestamps | timestamptz | standard |

Koefisien menjadi sumber perhitungan berat dan tidak boleh diambil dari string bebas pada item baru.

### 7.6 `procurement_register_sequences`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `document_type` | text | `PO_MATERIAL`, `PO_BESI`, `APPROVAL` |
| `year` | integer | tahun 4 digit |
| `last_sequence` | integer | >= 0 |
| `updated_at` | timestamptz | standard |

Primary key: `(document_type, year)`.

Nomor register dibuat atomik di database:

- PO Material: `PM-YY-0001`;
- PO Besi: `PB-YY-0001`;
- Approval: `AP-YY-0001`.

Perhitungan berbasis `count(*) + 1` dari aplikasi lama tidak digunakan karena tidak aman terhadap concurrency dan deletion.

### 7.7 `procurement_po_materials`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `register_no` | text | unique, not null, immutable |
| `receive_date` | date | nullable |
| `cluster_id` | uuid | nullable FK `master_cluster`, restrict |
| `contractor_id` | uuid | nullable FK `master_kontraktor`, restrict |
| `supplier_id` | uuid | nullable FK supplier, restrict |
| `po_no` | text | nullable |
| `po_date` | date | nullable |
| `status_id` | uuid | nullable FK status |
| `return_date` | date | nullable |
| `drive_link` | text | nullable |
| `material_type` | text | nullable; compatibility field dari `jenis_material` |
| `notes` | text | nullable |
| `created_by` | uuid | FK profiles/auth user |
| `updated_by` | uuid | FK profiles/auth user |
| timestamps | timestamptz | standard |

Indexes:

- `register_no` unique;
- `po_no`;
- `receive_date`;
- `cluster_id`;
- `contractor_id`;
- `supplier_id`;
- `status_id`.

### 7.8 `procurement_po_material_items`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `po_material_id` | uuid | FK parent, cascade delete |
| `material_id` | uuid | nullable FK material |
| `name_snapshot` | text | not null |
| `brand` | text | nullable |
| `specification` | text | nullable |
| `quantity` | numeric(18,3) | nullable, >= 0 |
| `unit` | text | nullable |
| `notes` | text | nullable |
| `sequence_no` | integer | > 0 |
| timestamps | timestamptz | standard |

Snapshot nama dipertahankan agar histori PO tidak berubah ketika master material diubah.

### 7.9 `procurement_po_steel`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `register_no` | text | unique, immutable |
| `receive_date` | date | nullable |
| `cluster_id` | uuid | nullable FK shared master |
| `contractor_id` | uuid | nullable FK shared master |
| `supplier_id` | uuid | nullable FK supplier |
| `po_no` | text | nullable |
| `po_date` | date | nullable |
| `status_id` | uuid | nullable FK status |
| `return_date` | date | nullable |
| `memo_qs_no` | text | nullable |
| `memo_date` | date | nullable |
| `drive_po_link` | text | nullable |
| `drive_memo_link` | text | nullable |
| `notes` | text | nullable |
| `created_by` | uuid | actor |
| `updated_by` | uuid | actor |
| timestamps | timestamptz | standard |

### 7.10 `procurement_po_steel_items`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `po_steel_id` | uuid | FK parent, cascade delete |
| `diameter_id` | uuid | FK diameter, restrict |
| `diameter_snapshot` | text | not null |
| `bar_count` | integer | >= 0 |
| `coefficient_snapshot` | numeric(18,6) | > 0 |
| `weight_kg` | numeric(18,3) | >= 0 |
| `notes` | text | nullable |
| `sequence_no` | integer | > 0 |
| timestamps | timestamptz | standard |

`weight_kg` dihitung dan divalidasi di database/RPC berdasarkan rumus legacy:

```text
weight_kg = (bar_count / 1000) × coefficient_snapshot
```

Nilai koefisien disalin sebagai snapshot agar PO lama stabil saat master koefisien berubah.

### 7.11 `procurement_approvals`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `register_no` | text | unique, immutable |
| `document_type` | text | nullable |
| `document_date` | date | nullable |
| `submit_date` | date | nullable |
| `review_date` | date | nullable |
| `approve_date` | date | nullable |
| `return_date` | date | nullable |
| `approver` | text | nullable |
| `cluster_id` | uuid | nullable FK shared master |
| `contractor_id` | uuid | nullable FK shared master |
| `material_id` | uuid | nullable FK material |
| `material_name_snapshot` | text | nullable |
| `brand` | text | nullable |
| `status_id` | uuid | nullable FK status |
| `scan_date` | date | nullable |
| `drive_link` | text | nullable |
| `tags` | text[] | default empty |
| `category` | text | nullable |
| `notes` | text | nullable |
| actor/timestamps | — | standard |

Tanggal harus konsisten secara kronologis ketika semuanya tersedia.

### 7.12 `procurement_steel_quotas`

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | PK |
| `contractor_id` | uuid | not null FK shared master |
| `cluster_id` | uuid | nullable FK shared master |
| `quota_kg` | numeric(18,3) | > 0 |
| `waste_percent` | numeric(8,3) | 0–100 |
| `notes` | text | nullable |
| `active` | boolean | default true |
| actor/timestamps | — | standard |

Unique active scope: contractor + nullable cluster, dikendalikan oleh constraint/index yang sesuai.

Derived values tidak disimpan sebagai editable columns:

```text
total_quota_with_waste = quota_kg × (1 + waste_percent / 100)
used_weight = SUM(procurement_po_steel_items.weight_kg)
remaining_quota = total_quota_with_waste - used_weight
percent_used = used_weight / total_quota_with_waste × 100
status = AMAN atau OVER_QUOTA
```

Gunakan SQL view/RPC untuk ringkasan kuota.

### 7.13 Audit

Rekomendasi target:

- gunakan `audit_log` existing sebagai log lintas domain;
- tambahkan metadata terstruktur melalui kolom baru atau tabel `procurement_activity_log` bila kontrak `audit_log` existing terlalu terbatas;
- Phase 2 harus memutuskan satu implementasi setelah meninjau schema production;
- tidak boleh ada tabel `activities` duplikat tanpa kebutuhan kuat.

## 8. Permission Matrix

| Capability | ADMIN | OPERATOR | VIEWER | Anonymous |
|---|---:|---:|---:|---:|
| Baca data Procurement | Ya | Ya | Ya | Tidak |
| Export/print | Ya | Ya | Ya | Tidak |
| Buat PO/Approval | Ya | Ya | Tidak | Tidak |
| Edit PO/Approval | Ya | Ya | Tidak | Tidak |
| Hapus draft tanpa downstream data | Ya | Terbatas | Tidak | Tidak |
| Ubah status workflow | Ya | Ya sesuai rule | Tidak | Tidak |
| Kelola kuota | Ya | Ya bila diberi scope | Tidak | Tidak |
| Kelola Supplier/Material/Status/Diameter | Ya | Tidak | Tidak | Tidak |
| Import legacy | Ya | Tidak | Tidak | Tidak |
| Akses audit | Ya | Tidak | Tidak | Tidak |

RLS wajib:

- anonymous tidak memiliki akses;
- inactive/invalid profile tidak memiliki akses;
- viewer read-only;
- operator mutation hanya pada domain transaction;
- admin mutation penuh dengan delete constraints;
- secure RPC wajib memeriksa role di database, bukan hanya UI.

## 9. UI Migration Decision Matrix

| Source PO Archive | Keputusan | Target | Catatan |
|---|---|---|---|
| `app/po-material/*` | Port + refactor | `features/procurement` | Ubah Next page menjadi React Router page |
| `app/po-besi/*` | Port + refactor | `features/procurement` | Kalkulasi juga divalidasi backend |
| `app/approval/*` | Port + refactor | `features/procurement` | Pakai status FK dan shared masters |
| `app/quota/page.tsx` | Port + rewrite data layer | `features/procurement` | Derived summary dari view/RPC |
| `app/reports/page.tsx` | Port + refactor | reports Procurement | Reuse export infrastructure host |
| `app/search/page.tsx` | Defer/merge | Global search host | Setelah core domain stabil |
| `components/data-table.tsx` | Evaluasi/reuse kecil | shared DataTable host | Jangan duplikasi |
| `components/sidebar.tsx` | Jangan dibawa | — | Gunakan AppLayout host |
| `components/topbar.tsx` | Jangan dibawa | — | Gunakan Navbar host |
| `components/master-crud.tsx` | Referensi saja | MasterData host | Hindari generic table mutation |
| `lib/register.ts` | Rewrite | secure DB sequence | Count-based numbering ditolak |
| `lib/steel.ts` | Port domain helper | feature utils | DB tetap authoritative |
| `lib/export.ts` | Port/refactor | shared export | Sanitasi dan lazy loading |
| `lib/activity.ts` | Rewrite | audit service | Gunakan user actor |
| `lib/supabase.ts` | Jangan dibawa | — | Gunakan host client |
| `hooks/use-crud.ts` | Jangan dibawa untuk workflow | — | Mutation eksplisit |
| `hooks/use-master-data.ts` | Refactor | feature query hooks | TanStack Query host |
| `components/ui/*` | Jangan disalin massal | — | Host sudah memiliki UI primitives |

## 10. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Migration PO Archive tidak lengkap | Schema tidak reproducible | Reconstruct dari source + remote metadata sebelum coding |
| Master cluster/contractor duplikat | Data reporting salah | Reuse shared masters dan mapping legacy |
| Production Disposal terganggu | Operasional berhenti | Migration additive, staging/local test, backup, dry-run |
| Nomor register duplikat | Integritas register rusak | DB sequence atomik dan unique constraint |
| Generic CRUD melewati workflow | Status/data tidak konsisten | Secure RPC per use case |
| JSON/legacy data ambigu | Import gagal | Dry-run, mapping report, unresolved queue |
| Nama sama tetapi entitas berbeda | Mapping salah | Normalized name + code + manual confirmation |
| Kalkulasi kuota hanya frontend | Nilai dapat dimanipulasi | View/RPC dan DB checks |
| Dua sistem tetap aktif terlalu lama | Drift data | Freeze date dan read-only cutover plan |

## 11. Non-Goals Phase 1

Phase ini tidak mencakup:

- migration SQL production;
- perubahan route/source code runtime;
- import data;
- penggantian branding;
- perubahan tabel Disposal existing;
- deployment;
- menjalankan `supabase db push`;
- menonaktifkan PO Archive;
- dashboard gabungan final;
- global search final;
- advanced approval permission;
- file upload/storage baru.

## 12. Keputusan yang Dikunci

1. `disposal-management` adalah host.
2. Integrasi memakai modul Procurement.
3. Satu Supabase project final.
4. `master_cluster` dan `master_kontraktor` dipakai bersama.
5. Supplier adalah master baru dan berbeda dari vendor disposal.
6. Next.js app shell PO Archive tidak dibawa.
7. Register number dibuat atomik di database.
8. Workflow mutation memakai secure RPC.
9. Viewer read-only; Operator transaction write; Admin full/admin master.
10. Data legacy diimport setelah fitur baru stabil.
11. PO Archive tetap tersedia sebagai fallback sampai cutover selesai.
12. Penggabungan dilakukan melalui patch bertahap.
