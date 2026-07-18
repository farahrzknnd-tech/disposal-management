import { supabase } from "./supabase";

export type AssignBatchResult = {
  requested_count: number;
  assigned_count: number;
  batches: Array<{ batch_id: string; nama_batch: string; assigned_count: number }>;
};

export type WorkflowResult = Record<string, unknown>;

export function getWorkflowErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message: unknown }).message);
  return "Operasi gagal.";
}

async function callWorkflow<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export function assignSuratJalanToAutoBatches(suratJalanIds: string[]): Promise<AssignBatchResult> {
  return callWorkflow("assign_surat_jalan_to_auto_batches", { p_surat_jalan_ids: suratJalanIds });
}

export function sendBatchToQsRpc(batchId: string): Promise<WorkflowResult> {
  return callWorkflow("send_batch_to_qs", { p_batch_id: batchId });
}

export function issueSpkForBatchCluster(args: { batchId: string; clusterId: string; nomorSpk?: string; tanggalSpk?: string; nominalSpk?: number | null }): Promise<WorkflowResult> {
  return callWorkflow("issue_spk_for_batch_cluster", {
    p_batch_id: args.batchId,
    p_cluster_id: args.clusterId,
    p_nomor_spk: args.nomorSpk,
    p_tanggal_spk: args.tanggalSpk,
    p_nominal_spk: args.nominalSpk,
  });
}

export function submitSpkInvoice(args: { spkId: string; nomorTagihan: string; tanggalTagihan: string; nominalTagihan: number; catatan?: string | null }): Promise<WorkflowResult> {
  return callWorkflow("submit_spk_invoice", {
    p_spk_id: args.spkId,
    p_nomor_tagihan: args.nomorTagihan,
    p_tanggal_tagihan: args.tanggalTagihan,
    p_nominal_tagihan: args.nominalTagihan,
    p_catatan: args.catatan,
  });
}

export function completeSpkWorkflow(args: { spkId: string }): Promise<WorkflowResult> {
  return callWorkflow("complete_spk_workflow", { p_spk_id: args.spkId });
}
