import { assignSuratJalanToAutoBatches, sendBatchToQsRpc, type AssignBatchResult } from "./workflows";

export async function assignSuratJalanToAutoBatch(sjIds: string[]): Promise<AssignBatchResult> {
  return assignSuratJalanToAutoBatches(sjIds);
}

export async function sendBatchToQs(batchId: string) {
  return sendBatchToQsRpc(batchId);
}
