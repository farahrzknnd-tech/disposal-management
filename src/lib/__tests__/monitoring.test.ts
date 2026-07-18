import { describe, expect, it } from 'vitest';
import { completedSpkCount, expectedClusterCount, monitoringProgress, outstandingAmount, spkOutstanding } from '../monitoring';
import { normalizeStatus } from '../status';

const sj = (cluster_id: string) => ({ cluster_id } as any);
const spk = (status: string, nominal_tagihan?: number | null, nominal_spk?: number | null) => ({ status, nominal_tagihan, nominal_spk } as any);

describe('monitoring calculations', () => {
  it('three clusters and three completed SPKs produce 100%', () => {
    expect(monitoringProgress([sj('A'), sj('B'), sj('C')], [spk('COMPLETED'), spk('COMPLETED'), spk('COMPLETED')])).toBe(100);
  });

  it('three clusters and two completed SPKs produce 67%', () => {
    expect(monitoringProgress([sj('A'), sj('B'), sj('C')], [spk('COMPLETED'), spk('COMPLETED')])).toBe(67);
  });

  it('completed SPKs contribute zero outstanding', () => {
    expect(spkOutstanding(spk('COMPLETED', 100, 200))).toBe(0);
  });

  it('non-completed SPK uses invoice nominal first', () => {
    expect(spkOutstanding(spk('INVOICED', 100, 200))).toBe(100);
  });

  it('non-invoiced SPK falls back to SPK nominal', () => {
    expect(spkOutstanding(spk('SPK_ISSUED', null, 200))).toBe(200);
  });

  it('master clusters do not affect progress', () => {
    const batchSjs = [sj('A'), sj('B'), sj('C')];
    expect(expectedClusterCount(batchSjs)).toBe(3);
    expect(monitoringProgress(batchSjs, [spk('COMPLETED')])).toBe(33);
  });

  it('canonical completed and legacy Selesai are recognized', () => {
    expect(completedSpkCount([spk('COMPLETED'), spk('Selesai')])).toBe(2);
    expect(normalizeStatus('Selesai')).toBe('COMPLETED');
  });

  it('outstanding sums only non-completed SPKs', () => {
    expect(outstandingAmount([spk('COMPLETED', 500), spk('INVOICED', 300), spk('SPK_ISSUED', null, 200)])).toBe(500);
  });
});
