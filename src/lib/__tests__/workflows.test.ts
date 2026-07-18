import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }) } }));

import { supabase } from "../supabase";
import { sendBatchToQsRpc } from "../workflows";

describe("workflow RPC boundary", () => {
  it("calls send_batch_to_qs", async () => {
    await sendBatchToQsRpc("batch-id");
    expect(supabase.rpc).toHaveBeenCalledWith("send_batch_to_qs", { p_batch_id: "batch-id" });
  });
});
