import { supabase } from "./supabase";

async function callWorkflow<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  return data as T;
}

export function sendBatchToQsRpc(batchId: string) {
  return callWorkflow("send_batch_to_qs", { p_batch_id: batchId });
}

export function issueSpkForBatchCluster(args: { batchId: string; clusterId: string; nomorSpk?: string; tanggalSpk?: string; nominalSpk?: number }) {
  return callWorkflow("issue_spk_for_batch_cluster", {
    p_batch_id: args.batchId,
    p_cluster_id: args.clusterId,
    p_nomor_spk: args.nomorSpk,
    p_tanggal_spk: args.tanggalSpk,
    p_nominal_spk: args.nominalSpk,
  });
}

export function completeSpkWorkflow(args: { spkId: string; nomorTagihan?: string; tanggalTagihan?: string; nominalTagihan?: number }) {
  return callWorkflow("complete_spk_workflow", {
    p_spk_id: args.spkId,
    p_nomor_tagihan: args.nomorTagihan,
    p_tanggal_tagihan: args.tanggalTagihan,
    p_nominal_tagihan: args.nominalTagihan,
  });
}
