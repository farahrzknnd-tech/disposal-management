/*
# Project Debris Disposal Management - Initial Schema

1. Overview
This migration creates the full schema for an internal Project Debris Disposal
Management System used by an Admin Project to manage the workflow from Surat
Jalan (delivery notes) through Batch -> SPK -> Tagihan. The app is internal-only,
has no sign-in screen, and is single-tenant: all data is intentionally shared
among admin users, so RLS policies allow anon + authenticated full CRUD.

2. New Tables
- `master_cluster` - master list of clusters (id, nama_cluster, status, created_at)
- `master_kontraktor` - master list of contractors (id, nama_kontraktor, alamat, telepon, status)
- `master_vendor` - master list of vendors (id, nama_vendor, status)
- `surat_jalan` - delivery notes from vendors. Links vendor, cluster, kontraktor
  and batch. Holds vehicle info, pickup/dam_truck counts, harga, total, status.
- `batch` - groups of surat_jalan sent to QS. Has periode and tanggal_kirim_qs.
- `spk` - Surat Perintah Kerja issued per cluster per batch. Holds SPK + tagihan info.
- `audit_log` - activity log for traceability.

3. Relationships
- surat_jalan.vendor_id -> master_vendor.id
- surat_jalan.cluster_id -> master_cluster.id
- surat_jalan.kontraktor_id -> master_kontraktor.id
- surat_jalan.batch_id -> batch.id (nullable, set when batched)
- spk.batch_id -> batch.id
- spk.cluster_id -> master_cluster.id
- UNIQUE (batch_id, cluster_id) enforces one SPK per cluster per batch.

4. Status Enum
- surat_jalan.status: 'Draft' (default), 'Dikirim ke QS', 'SPK Terbit',
  'Tagihan Diserahkan', 'Selesai'
- batch.status: 'Draft', 'Dikirim ke QS', 'SPK Terbit', 'Tagihan Diserahkan', 'Selesai'
- spk.status: 'Draft', 'SPK Terbit', 'Tagihan Diserahkan', 'Selesai'

5. Security
- RLS enabled on all tables.
- All tables allow anon + authenticated full CRUD because the app is internal
  and shared (no sign-in). USING (true) / WITH CHECK (true) is intentional.

6. Notes
- All ids are uuid with gen_random_uuid() default.
- created_at defaults to now().
- total on surat_jalan is computed as (dam_truck * harga) via a generated column
  so admin only inputs harga + dam_truck counts.
*/

-- Master Cluster
CREATE TABLE IF NOT EXISTS master_cluster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_cluster text NOT NULL,
  status text NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE master_cluster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_master_cluster" ON master_cluster;
CREATE POLICY "anon_select_master_cluster" ON master_cluster FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_master_cluster" ON master_cluster;
CREATE POLICY "anon_insert_master_cluster" ON master_cluster FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_master_cluster" ON master_cluster;
CREATE POLICY "anon_update_master_cluster" ON master_cluster FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_master_cluster" ON master_cluster;
CREATE POLICY "anon_delete_master_cluster" ON master_cluster FOR DELETE
  TO anon, authenticated USING (true);

-- Master Kontraktor
CREATE TABLE IF NOT EXISTS master_kontraktor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kontraktor text NOT NULL,
  alamat text,
  telepon text,
  status text NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE master_kontraktor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_master_kontraktor" ON master_kontraktor;
CREATE POLICY "anon_select_master_kontraktor" ON master_kontraktor FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_master_kontraktor" ON master_kontraktor;
CREATE POLICY "anon_insert_master_kontraktor" ON master_kontraktor FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_master_kontraktor" ON master_kontraktor;
CREATE POLICY "anon_update_master_kontraktor" ON master_kontraktor FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_master_kontraktor" ON master_kontraktor;
CREATE POLICY "anon_delete_master_kontraktor" ON master_kontraktor FOR DELETE
  TO anon, authenticated USING (true);

-- Master Vendor
CREATE TABLE IF NOT EXISTS master_vendor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_vendor text NOT NULL,
  status text NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE master_vendor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_master_vendor" ON master_vendor;
CREATE POLICY "anon_select_master_vendor" ON master_vendor FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_master_vendor" ON master_vendor;
CREATE POLICY "anon_insert_master_vendor" ON master_vendor FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_master_vendor" ON master_vendor;
CREATE POLICY "anon_update_master_vendor" ON master_vendor FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_master_vendor" ON master_vendor;
CREATE POLICY "anon_delete_master_vendor" ON master_vendor FOR DELETE
  TO anon, authenticated USING (true);

-- Batch
CREATE TABLE IF NOT EXISTS batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_batch text NOT NULL,
  periode_awal date,
  periode_akhir date,
  tanggal_kirim_qs date,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE batch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_batch" ON batch;
CREATE POLICY "anon_select_batch" ON batch FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_batch" ON batch;
CREATE POLICY "anon_insert_batch" ON batch FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_batch" ON batch;
CREATE POLICY "anon_update_batch" ON batch FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_batch" ON batch;
CREATE POLICY "anon_delete_batch" ON batch FOR DELETE
  TO anon, authenticated USING (true);

-- Surat Jalan
CREATE TABLE IF NOT EXISTS surat_jalan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  vendor_id uuid REFERENCES master_vendor(id) ON DELETE SET NULL,
  cluster_id uuid REFERENCES master_cluster(id) ON DELETE SET NULL,
  kontraktor_id uuid REFERENCES master_kontraktor(id) ON DELETE SET NULL,
  jenis_kendaraan text,
  pickup integer NOT NULL DEFAULT 0,
  dam_truck integer NOT NULL DEFAULT 0,
  nomor_polisi text,
  warna text,
  jam_keluar time,
  harga numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) GENERATED ALWAYS AS (
    (COALESCE(dam_truck, 0) + COALESCE(pickup, 0)) * COALESCE(harga, 0)
  ) STORED,
  batch_id uuid REFERENCES batch(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE surat_jalan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_surat_jalan" ON surat_jalan;
CREATE POLICY "anon_select_surat_jalan" ON surat_jalan FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_surat_jalan" ON surat_jalan;
CREATE POLICY "anon_insert_surat_jalan" ON surat_jalan FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_surat_jalan" ON surat_jalan;
CREATE POLICY "anon_update_surat_jalan" ON surat_jalan FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_surat_jalan" ON surat_jalan;
CREATE POLICY "anon_delete_surat_jalan" ON surat_jalan FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_surat_jalan_batch_id ON surat_jalan(batch_id);
CREATE INDEX IF NOT EXISTS idx_surat_jalan_cluster_id ON surat_jalan(cluster_id);
CREATE INDEX IF NOT EXISTS idx_surat_jalan_vendor_id ON surat_jalan(vendor_id);
CREATE INDEX IF NOT EXISTS idx_surat_jalan_status ON surat_jalan(status);
CREATE INDEX IF NOT EXISTS idx_surat_jalan_tanggal ON surat_jalan(tanggal);

-- SPK
CREATE TABLE IF NOT EXISTS spk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
  cluster_id uuid NOT NULL REFERENCES master_cluster(id) ON DELETE RESTRICT,
  nomor_spk text,
  tanggal_spk date,
  nominal_spk numeric(14,2),
  tanggal_tagihan date,
  nomor_tagihan text,
  nominal_tagihan numeric(14,2),
  status text NOT NULL DEFAULT 'Draft',
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, cluster_id)
);
ALTER TABLE spk ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_spk" ON spk;
CREATE POLICY "anon_select_spk" ON spk FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_spk" ON spk;
CREATE POLICY "anon_insert_spk" ON spk FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_spk" ON spk;
CREATE POLICY "anon_update_spk" ON spk FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_spk" ON spk;
CREATE POLICY "anon_delete_spk" ON spk FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_spk_batch_id ON spk(batch_id);
CREATE INDEX IF NOT EXISTS idx_spk_cluster_id ON spk(cluster_id);
CREATE INDEX IF NOT EXISTS idx_spk_status ON spk(status);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aktivitas text NOT NULL,
  "user" text NOT NULL DEFAULT 'Admin Project',
  tanggal timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit_log" ON audit_log;
CREATE POLICY "anon_select_audit_log" ON audit_log FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_log" ON audit_log;
CREATE POLICY "anon_insert_audit_log" ON audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit_log" ON audit_log;
CREATE POLICY "anon_update_audit_log" ON audit_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit_log" ON audit_log;
CREATE POLICY "anon_delete_audit_log" ON audit_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_tanggal ON audit_log(tanggal DESC);