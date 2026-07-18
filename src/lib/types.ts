export interface MasterCluster {
  id: string;
  nama_cluster: string;
  status: string;
  created_at: string;
}

export interface MasterKontraktor {
  id: string;
  nama_kontraktor: string;
  alamat: string | null;
  telepon: string | null;
  status: string;
  created_at: string;
}

export interface MasterVendor {
  id: string;
  nama_vendor: string;
  status: string;
  created_at: string;
}

export interface Batch {
  id: string;
  nama_batch: string;
  periode_awal: string | null;
  periode_akhir: string | null;
  tanggal_kirim_qs: string | null;
  status: string;
  created_at: string;
  catatan: string | null;
}

export interface SuratJalan {
  id: string;
  tanggal: string;
  vendor_id: string | null;
  cluster_id: string | null;
  kontraktor_id: string | null;
  jenis_kendaraan: string | null;
  pickup: number;
  dam_truck: number;
  nomor_polisi: string | null;
  warna: string | null;
  jam_keluar: string | null;
  harga: number;
  total: number;
  batch_id: string | null;
  spk_id: string | null;
  status: string;
  created_at: string;
  catatan: string | null;
  tanggal_batch: string | null;
}

export interface Spk {
  id: string;
  batch_id: string;
  cluster_id: string;
  nomor_spk: string | null;
  tanggal_spk: string | null;
  nominal_spk: number | null;
  tanggal_tagihan: string | null;
  nomor_tagihan: string | null;
  nominal_tagihan: number | null;
  status: string;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  aktivitas: string;
  user: string;
  tanggal: string;
}

// Workflow statuses for Batch (Belum Dikirim -> Proses QS -> Selesai)
export type StatusBatch = "Belum Dikirim" | "Proses QS" | "Selesai";

// Workflow statuses for SPK (Draft -> SPK Terbit -> Tagihan -> Selesai)
export type StatusSpk = "Draft" | "SPK Terbit" | "Tagihan" | "Selesai";

// Progress labels for Surat Jalan inside a Batch
export type StatusSJ = "Menunggu QS" | "Proses QS" | "SPK Terbit" | "Finished";

// Master data status
export type StatusMaster = "Aktif" | "Nonaktif";

export interface SuratJalanWithRelations extends SuratJalan {
  vendor?: MasterVendor | null;
  cluster?: MasterCluster | null;
  kontraktor?: MasterKontraktor | null;
  batch?: Batch | null;
  spk?: Spk | null;
}

export interface SpkWithRelations extends Spk {
  batch?: Batch | null;
  cluster?: MasterCluster | null;
}

export interface BatchWithRelations extends Batch {
  surat_jalan?: SuratJalan[];
  spk?: Spk[];
}
