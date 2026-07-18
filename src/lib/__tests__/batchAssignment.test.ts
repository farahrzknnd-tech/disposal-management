import { describe, expect, it } from "vitest";
import { assertValidAssignResult, formatAssignSuccess, shouldClearAssignSelection } from "../batchAssignment";

describe("assign result handling", () => {
  it("does not allow zero-assignment success", () => {
    expect(() => assertValidAssignResult({ requested_count: 1, assigned_count: 0, batches: [] }, 1)).toThrow("Tidak ada Surat Jalan");
  });

  it("retains selection after failure", () => {
    expect(() => shouldClearAssignSelection({ requested_count: 2, assigned_count: 1, batches: [] }, 2)).toThrow("Jumlah Surat Jalan");
  });

  it("formats multi-batch success", () => {
    expect(formatAssignSuccess({ requested_count: 3, assigned_count: 3, batches: [
      { batch_id: "a", nama_batch: "Batch Juli I 2026", assigned_count: 2 },
      { batch_id: "b", nama_batch: "Batch Juli II 2026", assigned_count: 1 },
    ] })).toBe("2 ke Batch Juli I 2026\n1 ke Batch Juli II 2026");
  });
});
