import type { Spk, SuratJalan } from './types';
import { isStatus, normalizeStatus } from './status';

export function expectedClusterCount(suratJalan: SuratJalan[]): number {
  return new Set(suratJalan.map((sj) => sj.cluster_id).filter(Boolean)).size;
}

export function completedSpkCount(spks: Spk[]): number {
  return spks.filter((spk) => isStatus(spk.status, 'COMPLETED')).length;
}

export function monitoringProgress(suratJalan: SuratJalan[], spks: Spk[]): number {
  const expected = expectedClusterCount(suratJalan);
  if (expected === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completedSpkCount(spks) / expected) * 100)));
}

export function spkOutstanding(spk: Pick<Spk, 'status' | 'nominal_tagihan' | 'nominal_spk'>): number {
  if (normalizeStatus(spk.status) === 'COMPLETED') return 0;
  return Number(spk.nominal_tagihan ?? spk.nominal_spk ?? 0);
}

export function outstandingAmount(spks: Spk[]): number {
  return spks.reduce((sum, spk) => sum + spkOutstanding(spk), 0);
}
