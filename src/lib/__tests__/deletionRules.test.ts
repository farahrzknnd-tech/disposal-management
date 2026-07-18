import { describe, expect, it } from 'vitest';
import { canDeleteBatch, canDeleteSuratJalan, ensureBulkSuratJalanDeletable } from '../deletionRules';

const sj = (status: string, batchStatus?: string | null, spk_id: string | null = null) => ({
  status,
  spk_id,
  batch_id: batchStatus === undefined ? null : 'batch-id',
  batch: batchStatus === undefined ? null : { status: batchStatus },
} as any);

const batch = (status: string, surat_jalan_count: number, spk_count = 0) => ({ status, surat_jalan_count, spk_count } as any);

describe('deletion rules', () => {
  it('allows unassigned DRAFT Surat Jalan', () => {
    expect(canDeleteSuratJalan(sj('DRAFT')).allowed).toBe(true);
  });

  it('allows READY_FOR_QS Surat Jalan without SPK', () => {
    expect(canDeleteSuratJalan(sj('READY_FOR_QS', 'READY_FOR_QS')).allowed).toBe(true);
  });

  it('rejects processed Surat Jalan statuses', () => {
    for (const status of ['IN_QS_REVIEW', 'SPK_ISSUED', 'INVOICED', 'COMPLETED', 'CANCELLED']) {
      expect(canDeleteSuratJalan(sj(status)).allowed).toBe(false);
    }
  });

  it('rejects Surat Jalan with SPK', () => {
    expect(canDeleteSuratJalan(sj('READY_FOR_QS', 'READY_FOR_QS', 'spk-id')).reason).toBe('Surat Jalan yang sudah memiliki SPK tidak dapat dihapus.');
  });

  it('fails mixed bulk requests', () => {
    expect(ensureBulkSuratJalanDeletable([sj('DRAFT'), sj('COMPLETED')]).allowed).toBe(false);
  });

  it('allows READY_FOR_QS batch deletion', () => {
    expect(canDeleteBatch(batch('READY_FOR_QS', 10)).allowed).toBe(true);
  });

  it('allows empty COMPLETED batch as orphan cleanup', () => {
    const result = canDeleteBatch(batch('COMPLETED', 0, 3));
    expect(result.allowed).toBe(true);
    expect(result.orphanCleanup).toBe(true);
  });

  it('rejects non-empty COMPLETED batch', () => {
    expect(canDeleteBatch(batch('COMPLETED', 1)).allowed).toBe(false);
  });
});
