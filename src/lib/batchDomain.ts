import { MONTH_NAMES_ID } from './constants';

export function jakartaDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function operationalBatchName(bulanBatch: string, urutanBatch: 1 | 2): string {
  const [year, month] = bulanBatch.split('-').map(Number);
  return `Batch ${MONTH_NAMES_ID[month - 1]} ${year} ${urutanBatch === 1 ? 'I' : 'II'}`;
}

export function calculateCoverage(dates: string[]): { periode_awal: string | null; periode_akhir: string | null } {
  if (dates.length === 0) return { periode_awal: null, periode_akhir: null };
  const sorted = [...dates].sort();
  return { periode_awal: sorted[0], periode_akhir: sorted[sorted.length - 1] };
}

export function duplicateOperationalBatchExists(batches: Array<{ bulan_batch?: string | null; urutan_batch?: number | null }>, bulanBatch: string, urutanBatch: 1 | 2): boolean {
  return batches.some((batch) => batch.bulan_batch === bulanBatch && batch.urutan_batch === urutanBatch);
}
