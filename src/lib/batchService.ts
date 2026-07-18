import { assignSuratJalanToBatch, createBatchAndAssignSuratJalan, sendBatchToQsRpc, type AssignBatchResult } from "./workflows";

export async function assignSuratJalanToExistingBatch(batchId: string, sjIds: string[]): Promise<AssignBatchResult> {
  return assignSuratJalanToBatch(batchId, sjIds);
}

export async function createBatchAndAssign(args: { bulanBatch: string; urutanBatch: 1 | 2; tanggalDiterima: string; catatan?: string | null; suratJalanIds: string[] }): Promise<AssignBatchResult> {
  return createBatchAndAssignSuratJalan(args);
}

export async function sendBatchToQs(batchId: string) {
  return sendBatchToQsRpc(batchId);
}
