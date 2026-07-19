import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ supabase: { rpc: vi.fn() } }));

import { supabase } from "../supabase";
import { assignSuratJalanToBatch, createBatchAndAssignSuratJalan, deleteReadyBatch, deleteSuratJalan, sendBatchToQsRpc } from "../workflows";

describe("workflow RPC boundary", () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());

  it("calls send_batch_to_qs", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true }, error: null });
    await sendBatchToQsRpc("batch-id");
    expect(supabase.rpc).toHaveBeenCalledWith("send_batch_to_qs", { p_batch_id: "batch-id" });
  });

  it("calls assign_surat_jalan_to_batch", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true }, error: null });
    await assignSuratJalanToBatch("batch-id", ["sj-id"]);
    expect(supabase.rpc).toHaveBeenCalledWith("assign_surat_jalan_to_batch", { p_batch_id: "batch-id", p_surat_jalan_ids: ["sj-id"] });
  });

  it("calls create_batch_and_assign_surat_jalan", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true }, error: null });
    await createBatchAndAssignSuratJalan({ bulanBatch: "2026-07-01", urutanBatch: 1, tanggalDiterima: "2026-07-15", suratJalanIds: ["sj-id"] });
    expect(supabase.rpc).toHaveBeenCalledWith("create_batch_and_assign_surat_jalan", expect.objectContaining({ p_bulan_batch: "2026-07-01", p_urutan_batch: 1, p_surat_jalan_ids: ["sj-id"] }));
  });

  it("calls delete_surat_jalan_safely", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { deleted_count: 1 }, error: null });
    await deleteSuratJalan(["sj-id"]);
    expect(supabase.rpc).toHaveBeenCalledWith("delete_surat_jalan_safely", { p_surat_jalan_ids: ["sj-id"] });
  });

  it("calls delete_batch_safely", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { released_count: 1 }, error: null });
    await deleteReadyBatch("batch-id");
    expect(supabase.rpc).toHaveBeenCalledWith("delete_batch_safely", { p_batch_id: "batch-id" });
  });

  it("throws Supabase errors", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: "Batch tidak memiliki Surat Jalan." } });
    await expect(assignSuratJalanToBatch("batch-id", ["sj-id"])).rejects.toThrow("Batch tidak memiliki Surat Jalan.");
  });
});
