import type { AssignBatchResult } from "./workflows";

export function assertValidAssignResult(result: AssignBatchResult, requestedCount: number): AssignBatchResult {
  if (result.assigned_count === 0) throw new Error("Tidak ada Surat Jalan yang berhasil dimasukkan ke batch.");
  if (result.assigned_count !== requestedCount) throw new Error("Jumlah Surat Jalan yang diproses tidak sesuai pilihan.");
  return result;
}

export function formatAssignSuccess(result: AssignBatchResult): string {
  return result.batches.map((batch) => `${batch.assigned_count} ke ${batch.nama_batch}`).join("\n");
}

export function shouldClearAssignSelection(result: AssignBatchResult, requestedCount: number): boolean {
  assertValidAssignResult(result, requestedCount);
  return true;
}
