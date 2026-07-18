import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch, MasterCluster, Spk, SuratJalan } from '@/lib/types';

export interface BatchWithStats extends Batch {
  surat_jalan_count: number;
  cluster_count: number;
  pickup: number;
  dam_truck: number;
  estimasi_total: number;
}

export interface BatchDetailData {
  batch: Batch | null;
  suratJalan: SuratJalan[];
  spks: Spk[];
  clusters: MasterCluster[];
}

export function useBatches() {
  return useQuery<BatchWithStats[]>({
    queryKey: ['batch', 'with_stats'],
    queryFn: async () => {
      const { data: batches } = await supabase
        .from('batch')
        .select('*')
        .order('created_at', { ascending: false });
      const batchList = (batches as Batch[]) ?? [];
      if (batchList.length === 0) return [];

      const { data: sj } = await supabase
        .from('surat_jalan')
        .select('*')
        .in('batch_id', batchList.map((b) => b.id));
      const sjList = (sj as SuratJalan[]) ?? [];

      return batchList.map((b) => {
        const items = sjList.filter((s) => s.batch_id === b.id);
        const pickup = items.reduce((acc, s) => acc + s.pickup, 0);
        const damTruck = items.reduce((acc, s) => acc + s.dam_truck, 0);
        const clusterCount = new Set(items.map((s) => s.cluster_id).filter(Boolean)).size;
        const estimasi = items.reduce(
          (acc, s) => acc + s.pickup * 100_000 + s.dam_truck * 170_000,
          0
        );
        return {
          ...b,
          surat_jalan_count: items.length,
          cluster_count: clusterCount,
          pickup,
          dam_truck: damTruck,
          estimasi_total: estimasi,
        };
      });
    },
  });
}

export function useBatchDetail(id: string | undefined) {
  return useQuery<BatchDetailData>({
    queryKey: ['batch', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return { batch: null, suratJalan: [], spks: [], clusters: [] };
      const { data: batch } = await supabase
        .from('batch')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      const { data: sj } = await supabase
        .from('surat_jalan')
        .select('*')
        .eq('batch_id', id)
        .order('tanggal', { ascending: true });
      const { data: spks } = await supabase
        .from('spk')
        .select('*')
        .eq('batch_id', id)
        .order('created_at', { ascending: true });
      const { data: clusters } = await supabase.from('master_cluster').select('*');
      return {
        batch: (batch as Batch | null) ?? null,
        suratJalan: (sj as SuratJalan[]) ?? [],
        spks: (spks as Spk[]) ?? [],
        clusters: (clusters as MasterCluster[]) ?? [],
      };
    },
  });
}
