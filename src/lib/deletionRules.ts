import type { Batch, SuratJalanWithRelations } from './types';
import { isStatus } from './status';

export type DeleteEligibility = { allowed: boolean; reason: string };

export function canDeleteSuratJalan(row: Pick<SuratJalanWithRelations, 'batch_id' | 'spk_id' | 'status' | 'batch'>): DeleteEligibility {
  if (row.spk_id) return { allowed: false, reason: 'Surat Jalan yang sudah memiliki SPK tidak dapat dihapus.' };
  if (isStatus(row.status, 'IN_QS_REVIEW') || isStatus(row.status, 'SPK_ISSUED') || isStatus(row.status, 'INVOICED') || isStatus(row.status, 'COMPLETED') || isStatus(row.status, 'CANCELLED')) {
    return { allowed: false, reason: 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.' };
  }
  if (!row.batch_id) return isStatus(row.status, 'DRAFT') ? { allowed: true, reason: '' } : { allowed: false, reason: 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.' };
  if (!row.batch || !isStatus(row.batch.status, 'READY_FOR_QS')) return { allowed: false, reason: 'Surat Jalan yang sudah diproses QS tidak dapat dihapus.' };
  return { allowed: true, reason: '' };
}

export function canDeleteBatch(batch: Pick<Batch, 'status'> & { surat_jalan_count: number; spk_count: number }): DeleteEligibility & { orphanCleanup: boolean } {
  if (batch.surat_jalan_count === 0) return { allowed: true, reason: 'Hapus batch kosong', orphanCleanup: !isStatus(batch.status, 'READY_FOR_QS') || batch.spk_count > 0 };
  if (isStatus(batch.status, 'READY_FOR_QS') && batch.spk_count === 0) return { allowed: true, reason: '', orphanCleanup: false };
  if (batch.spk_count > 0) return { allowed: false, reason: 'Batch memiliki data workflow aktif dan tidak dapat dihapus.', orphanCleanup: false };
  return { allowed: false, reason: 'Batch yang sudah diproses tidak dapat dihapus.', orphanCleanup: false };
}

export function ensureBulkSuratJalanDeletable(rows: Array<Pick<SuratJalanWithRelations, 'batch_id' | 'spk_id' | 'status' | 'batch'>>): DeleteEligibility {
  const blocked = rows.map(canDeleteSuratJalan).find((result) => !result.allowed);
  return blocked ?? { allowed: true, reason: '' };
}
