import type { WorkflowStatus } from "./status";

export const PICKUP_PRICE = 100_000;
export const DAM_TRUCK_PRICE = 170_000;

// SPK workflow statuses
export const SPK_STATUSES: WorkflowStatus[] = ["DRAFT", "SPK_ISSUED", "INVOICED", "COMPLETED"];

// Batch workflow statuses
export const BATCH_STATUSES: WorkflowStatus[] = ["READY_FOR_QS", "IN_QS_REVIEW", "SPK_ISSUED", "INVOICED", "COMPLETED"];

// Surat Jalan progress labels (inside a batch)
export const SJ_PROGRESS = ["Menunggu QS", "Proses QS", "SPK Terbit", "Finished"] as const;

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  READY_FOR_QS: "bg-gray-100 text-gray-700 border-gray-200",
  IN_QS_REVIEW: "bg-blue-100 text-blue-700 border-blue-200",
  SPK_ISSUED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  INVOICED: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  // Batch statuses
  "Belum Dikirim": "bg-gray-100 text-gray-700 border-gray-200",
  "Proses QS": "bg-blue-100 text-blue-700 border-blue-200",
  Selesai: "bg-green-100 text-green-700 border-green-200",
  // SPK statuses
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  "SPK Terbit": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Tagihan: "bg-orange-100 text-orange-700 border-orange-200",
  // SJ progress
  "Menunggu QS": "bg-gray-100 text-gray-700 border-gray-200",
  Finished: "bg-green-100 text-green-700 border-green-200",
  // Master data
  Aktif: "bg-green-100 text-green-700 border-green-200",
  "Tidak Aktif": "bg-red-100 text-red-700 border-red-200",
  // Legacy (kept for compatibility with other pages)
  "Dikirim ke QS": "bg-blue-100 text-blue-700 border-blue-200",
  "Tagihan Diserahkan": "bg-orange-100 text-orange-700 border-orange-200",
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-400",
  READY_FOR_QS: "bg-gray-400",
  IN_QS_REVIEW: "bg-blue-400",
  SPK_ISSUED: "bg-yellow-400",
  INVOICED: "bg-orange-400",
  COMPLETED: "bg-green-400",
  CANCELLED: "bg-red-400",
  "Belum Dikirim": "bg-gray-400",
  "Proses QS": "bg-blue-400",
  Selesai: "bg-green-400",
  Draft: "bg-gray-400",
  "SPK Terbit": "bg-yellow-400",
  Tagihan: "bg-orange-400",
  "Menunggu QS": "bg-gray-400",
  Finished: "bg-green-400",
  Aktif: "bg-green-400",
  "Tidak Aktif": "bg-red-400",
  "Dikirim ke QS": "bg-blue-400",
  "Tagihan Diserahkan": "bg-orange-400",
};

export const JENIS_KENDARAAN_OPTIONS = ["Pickup", "Dump Truck"] as const;

export const SIDEBAR_MENU = [
  { label: "Dashboard", path: "/", icon: "LayoutDashboard" },
  { label: "Surat Jalan", path: "/surat-jalan", icon: "FileText" },
  { label: "Batch Pengiriman", path: "/batch", icon: "Package" },
  { label: "SPK", path: "/spk", icon: "FileSignature" },
  { label: "Monitoring", path: "/monitoring", icon: "Activity" },
  { label: "Rekap Cluster", path: "/rekap-cluster", icon: "BarChart3" },
  { label: "Analisa", path: "/analisa", icon: "TrendingUp" },
  { label: "Performance", path: "/performance", icon: "Gauge" },
  { label: "Laporan", path: "/laporan", icon: "ClipboardList" },
  { label: "Export Center", path: "/export", icon: "Download" },
  { label: "Audit Log", path: "/audit-log", icon: "History" },
  { label: "Master Data", path: "/master-data", icon: "Database" },
  { label: "Pengaturan", path: "/pengaturan", icon: "Settings" },
] as const;

export const DEFAULT_COMPANY = {
  name: "PT. Debris Disposal Management",
  address: "Jakarta, Indonesia",
  phone: "+62 21 0000 0000",
  email: "info@debris.co.id",
  footer: "Created by Farah Ananda",
};

export const DEFAULT_FORMATS = {
  batch: "BATCH-{YYYY}{MM}-{NNN}",
  spk: "SPK/{YYYY}/{MM}/{NNN}",
  tagihan: "INV-{YYYY}{MM}-{NNN}",
};

// ---- Automatic Batch helpers ----

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const ROMAN = ["I", "II"];

function parseDateOnly(date: string | Date): { year: number; month: number; day: number } {
  if (date instanceof Date) return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Date must use YYYY-MM-DD");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Determine the batch segment for a given date.
 * Days 1-15 -> segment 0 (I), days 16-end -> segment 1 (II).
 */
export function getBatchSegment(date: string | Date): 0 | 1 {
  const { day } = parseDateOnly(date);
  return day <= 15 ? 0 : 1;
}

/**
 * Build the batch name for a date, e.g. "Batch Juli I 2026".
 */
export function buildBatchName(date: string | Date): string {
  const { year, month } = parseDateOnly(date);
  const monthName = MONTH_NAMES_ID[month - 1];
  const segment = getBatchSegment(date);
  return `Batch ${monthName} ${ROMAN[segment]} ${year}`;
}

/**
 * Compute the period range [start, end] for the batch segment containing the date.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export function getBatchPeriod(date: string | Date): { awal: string; akhir: string } {
  const { year, month } = parseDateOnly(date);
  const segment = getBatchSegment(date);
  const startDay = segment === 0 ? 1 : 16;
  const endDay = segment === 0 ? 15 : lastDayOfMonth(year, month);
  return { awal: formatDateOnly(year, month, startDay), akhir: formatDateOnly(year, month, endDay) };
}

export function hitungEstimasi(pickup: number, damTruck: number): number {
  return pickup * PICKUP_PRICE + damTruck * DAM_TRUCK_PRICE;
}
