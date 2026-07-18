import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch, MasterCluster, Spk, SpkWithRelations, SuratJalan } from '@/lib/types';

export interface SpkDetailData {
  spk: Spk | null;
  batch: Batch | null;
  cluster: MasterCluster | null;
  suratJalan: SuratJalan[];
}

export function useSpkList() {
  return useQuery<SpkWithRelations[]>({
    queryKey: ['spk', 'list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('spk')
        .select('*, batch:batch(*), cluster:master_cluster(*)')
        .order('created_at', { ascending: false });
      return (data as unknown as SpkWithRelations[]) ?? [];
    },
  });
}

export function useSpkDetail(id: string | undefined) {
  return useQuery<SpkDetailData>({
    queryKey: ['spk', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return { spk: null, batch: null, cluster: null, suratJalan: [] };
      const { data: spk } = await supabase
        .from('spk')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      const spkData = spk as Spk | null;
      let batch: Batch | null = null;
      let cluster: MasterCluster | null = null;
      let suratJalan: SuratJalan[] = [];
      if (spkData) {
        const [b, c, sj] = await Promise.all([
          supabase.from('batch').select('*').eq('id', spkData.batch_id).maybeSingle(),
          supabase.from('master_cluster').select('*').eq('id', spkData.cluster_id).maybeSingle(),
          supabase
            .from('surat_jalan')
            .select('*, vendor:master_vendor(*), kontraktor:master_kontraktor(*)')
            .eq('batch_id', spkData.batch_id)
            .eq('cluster_id', spkData.cluster_id)
            .order('tanggal', { ascending: true }),
        ]);
        batch = (b.data as Batch | null) ?? null;
        cluster = (c.data as MasterCluster | null) ?? null;
        suratJalan = (sj.data as unknown as SuratJalan[]) ?? [];
      }
      return { spk: spkData, batch, cluster, suratJalan };
    },
  });
}
