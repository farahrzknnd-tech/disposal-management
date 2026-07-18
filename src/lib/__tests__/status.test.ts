import { describe, expect, it } from "vitest";
import { normalizeStatus, statusLabel } from "../status";

describe("status mapping", () => {
  it("maps legacy statuses", () => {
    expect(normalizeStatus("Belum Dikirim")).toBe("READY_FOR_QS");
    expect(normalizeStatus("Proses QS")).toBe("IN_QS_REVIEW");
    expect(normalizeStatus("Tagihan Diserahkan")).toBe("INVOICED");
    expect(normalizeStatus("Finished")).toBe("COMPLETED");
  });
  it("labels machine statuses", () => {
    expect(statusLabel("COMPLETED")).toBe("Selesai");
  });
});
