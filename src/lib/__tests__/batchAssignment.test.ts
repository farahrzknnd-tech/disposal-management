import { describe, expect, it } from "vitest";
import { assertValidAssignResult, formatAssignSuccess, shouldClearAssignSelection } from "../batchAssignment";

const result = (assigned_count: number) => ({ batch_id: 'b', nama_batch: 'Batch Juli 2026 I', requested_count: 2, assigned_count, periode_awal: '2026-04-03', periode_akhir: '2026-07-14' });

describe("assign result handling", () => {
  it("does not allow zero-assignment success", () => {
    expect(() => assertValidAssignResult(result(0), 1)).toThrow("Tidak ada Surat Jalan");
  });

  it("retains selection after failure", () => {
    expect(() => shouldClearAssignSelection(result(1), 2)).toThrow("Jumlah Surat Jalan");
  });

  it("formats operational batch success", () => {
    expect(formatAssignSuccess(result(2))).toBe("2 ke Batch Juli 2026 I");
  });
});
