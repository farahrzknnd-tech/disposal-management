import { describe, expect, it } from "vitest";
import { computeBatchStatus } from "../batchStatus";

describe("workflow expectations", () => {
  it("first cluster SPK does not complete SPK issuance", () => {
    expect(computeBatchStatus(2, [{ status: "SPK_ISSUED" } as any], true)).toBe("IN_QS_REVIEW");
  });

  it("batch becomes SPK_ISSUED after every cluster has SPK", () => {
    expect(computeBatchStatus(2, [{ status: "SPK_ISSUED" } as any, { status: "SPK_ISSUED" } as any], true)).toBe("SPK_ISSUED");
  });

  it("one completed SPK does not complete multi-SPK batch", () => {
    expect(computeBatchStatus(2, [{ status: "COMPLETED" } as any, { status: "INVOICED" } as any], true)).toBe("INVOICED");
  });

  it("final completed SPK completes batch", () => {
    expect(computeBatchStatus(2, [{ status: "COMPLETED" } as any, { status: "COMPLETED" } as any], true)).toBe("COMPLETED");
  });
});
