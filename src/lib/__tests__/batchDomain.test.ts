import { describe, expect, it } from 'vitest';
import { calculateCoverage, duplicateOperationalBatchExists, operationalBatchName } from '../batchDomain';

describe('operational batch domain', () => {
  it('names July 2026 sequence 1', () => {
    expect(operationalBatchName('2026-07-01', 1)).toBe('Batch Juli 2026 I');
  });

  it('names July 2026 sequence 2', () => {
    expect(operationalBatchName('2026-07-01', 2)).toBe('Batch Juli 2026 II');
  });

  it('allows April, May, and July Surat Jalan coverage in same July batch', () => {
    expect(calculateCoverage(['2026-07-14', '2026-04-03', '2026-05-20'])).toEqual({ periode_awal: '2026-04-03', periode_akhir: '2026-07-14' });
  });

  it('does not mutate original Surat Jalan dates', () => {
    const dates = ['2026-07-14', '2026-04-03'];
    calculateCoverage(dates);
    expect(dates).toEqual(['2026-07-14', '2026-04-03']);
  });

  it('rejects duplicate month and sequence', () => {
    expect(duplicateOperationalBatchExists([{ bulan_batch: '2026-07-01', urutan_batch: 1 }], '2026-07-01', 1)).toBe(true);
  });

  it('allows Batch I and Batch II in same month', () => {
    expect(duplicateOperationalBatchExists([{ bulan_batch: '2026-07-01', urutan_batch: 1 }], '2026-07-01', 2)).toBe(false);
  });
});
