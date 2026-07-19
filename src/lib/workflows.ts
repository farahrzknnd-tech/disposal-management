import { supabase } from "./supabase";

export type AssignBatchResult = {
  batch_id: string;
  nama_batch: string;
  requested_count: number;
  assigned_count: number;
  periode_awal: string | null;
  periode_akhir: string | null;
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

export function assignSuratJalanToBatch(batchId: string, suratJalanIds: string[]): Promise<AssignBatchResult> {
  return callWorkflow("assign_surat_jalan_to_batch", { p_batch_id: batchId, p_surat_jalan_ids: suratJalanIds });
}

export function createBatchAndAssignSuratJalan(args: { bulanBatch: string; urutanBatch: 1 | 2; tanggalDiterima: string; catatan?: string | null; suratJalanIds: string[] }): Promise<AssignBatchResult> {
  return callWorkflow("create_batch_and_assign_surat_jalan", {
    p_bulan_batch: args.bulanBatch,
    p_urutan_batch: args.urutanBatch,
    p_tanggal_diterima: args.tanggalDiterima,
    p_catatan: args.catatan ?? null,
    p_surat_jalan_ids: args.suratJalanIds,
  });
}

export function deleteReadyBatch(batchId: string): Promise<WorkflowResult> {
  return callWorkflow("delete_batch_safely", { p_batch_id: batchId });
}

export function deleteSuratJalan(suratJalanIds: string[]): Promise<WorkflowResult> {
  return callWorkflow("delete_surat_jalan_safely", { p_surat_jalan_ids: suratJalanIds });
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
