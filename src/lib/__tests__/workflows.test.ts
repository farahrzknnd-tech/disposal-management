import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ supabase: { rpc: vi.fn() } }));

import { supabase } from "../supabase";
import { assignSuratJalanToAutoBatches, sendBatchToQsRpc } from "../workflows";

describe("workflow RPC boundary", () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());

  it("calls send_batch_to_qs", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true }, error: null });
    await sendBatchToQsRpc("batch-id");
    expect(supabase.rpc).toHaveBeenCalledWith("send_batch_to_qs", { p_batch_id: "batch-id" });
  });

  it("throws Supabase errors", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: "Batch tidak memiliki Surat Jalan." } });
    await expect(assignSuratJalanToAutoBatches(["sj-id"])).rejects.toThrow("Batch tidak memiliki Surat Jalan.");
  });
});
