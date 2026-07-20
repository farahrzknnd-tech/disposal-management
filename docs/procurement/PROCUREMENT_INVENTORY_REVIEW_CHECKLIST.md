# Procurement Inventory Review Checklist

## A. Remote dan Scope

- [ ] Query dijalankan pada Supabase PO Archive, bukan Disposal production.
- [ ] Waktu capture dicatat.
- [ ] Environment/version berhasil diperoleh.
- [ ] Tidak ada mutation query yang dijalankan.
- [ ] Tidak ada secret key disimpan di repository.

## B. Schema Completeness

- [ ] `clusters`
- [ ] `contractors`
- [ ] `suppliers`
- [ ] `materials`
- [ ] `statuses`
- [ ] `steel_diameters`
- [ ] `steel_quotas`
- [ ] `po_materials`
- [ ] `po_material_items`
- [ ] `po_besi`
- [ ] `po_besi_items`
- [ ] `approvals`
- [ ] `activities`

Untuk setiap tabel:

- [ ] Primary key diketahui.
- [ ] Foreign key diketahui.
- [ ] Nullability diketahui.
- [ ] Default diketahui.
- [ ] Unique/check constraints diketahui.
- [ ] Delete behavior diketahui.
- [ ] Index diketahui.
- [ ] RLS dan grants diketahui.

## C. Master Data Mapping

### Cluster

- [ ] Jumlah legacy cluster diketahui.
- [ ] Duplicate normalized names diketahui.
- [ ] Mapping ke `master_cluster` dilakukan exact normalized match.
- [ ] Ambiguous mapping masuk manual-review list.

### Contractor

- [ ] Jumlah legacy contractor diketahui.
- [ ] Duplicate normalized names diketahui.
- [ ] `contact` diprofilkan sebagai PIC/telepon/catatan.
- [ ] Mapping ke `master_kontraktor` tidak menggunakan substring otomatis.

### Supplier/Material/Status/Diameter

- [ ] Kode/nama duplikat diketahui.
- [ ] Null/blank master names diketahui.
- [ ] Status category values terinventarisasi.
- [ ] Diameter/coefficient yang tidak valid diketahui.

## D. Transaction Quality

### PO Material

- [ ] Header tanpa item diketahui.
- [ ] Orphan item diketahui.
- [ ] Duplicate register diketahui.
- [ ] Missing cluster/contractor/supplier diketahui.
- [ ] Invalid/negative qty diketahui.

### PO Besi

- [ ] Header tanpa item diketahui.
- [ ] Orphan item diketahui.
- [ ] `diameter` vs `diameter_id` consistency ditinjau.
- [ ] `berat_kg` vs hasil kalkulasi ditinjau.
- [ ] Missing supplier diketahui.
- [ ] Duplicate register diketahui.

### Approval

- [ ] Duplicate register diketahui.
- [ ] Missing contractor/cluster diketahui.
- [ ] Chronology submit/review/approve/return ditinjau.
- [ ] Status values diinventarisasi.

### Quota

- [ ] Duplicate contractor+cluster quota diketahui.
- [ ] Negative quota/waste diketahui.
- [ ] Over-quota records diketahui.

## E. Patch 2 Gate

- [ ] Final target tables disetujui.
- [ ] Existing master reuse disetujui.
- [ ] Register format disetujui.
- [ ] Monetary/weight precision disetujui.
- [ ] RLS matrix disetujui.
- [ ] RPC mutation boundary disetujui.
- [ ] Seed master strategy disetujui.
- [ ] Legacy import belum dijalankan.
- [ ] Production database belum diubah.
