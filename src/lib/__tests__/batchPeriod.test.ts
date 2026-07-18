import { describe, expect, it } from "vitest";
import { buildBatchName, getBatchPeriod, getBatchSegment } from "../constants";

describe("batch period helpers", () => {
  it("date 1 belongs to Batch I", () => {
    expect(getBatchSegment("2026-07-01")).toBe(0);
    expect(getBatchPeriod("2026-07-01")).toEqual({ awal: "2026-07-01", akhir: "2026-07-15" });
  });

  it("date 15 belongs to Batch I", () => {
    expect(getBatchSegment("2026-07-15")).toBe(0);
    expect(buildBatchName("2026-07-15")).toBe("Batch Juli I 2026");
  });

  it("date 16 belongs to Batch II", () => {
    expect(getBatchSegment("2026-07-16")).toBe(1);
    expect(getBatchPeriod("2026-07-16")).toEqual({ awal: "2026-07-16", akhir: "2026-07-31" });
  });

  it("handles final day boundaries", () => {
    expect(getBatchPeriod("2026-02-28").akhir).toBe("2026-02-28");
    expect(getBatchPeriod("2028-02-29").akhir).toBe("2028-02-29");
    expect(getBatchPeriod("2026-04-30").akhir).toBe("2026-04-30");
    expect(getBatchPeriod("2026-07-31").akhir).toBe("2026-07-31");
  });

  it("handles December without January drift", () => {
    expect(buildBatchName("2026-12-31")).toBe("Batch Desember II 2026");
    expect(getBatchPeriod("2026-12-31")).toEqual({ awal: "2026-12-16", akhir: "2026-12-31" });
  });

  it("does not drift plain date strings across timezones", () => {
    expect(buildBatchName("2026-07-01")).toBe("Batch Juli I 2026");
  });
});
