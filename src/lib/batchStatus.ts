import type { Spk, StatusBatch, StatusSJ, StatusSpk } from "./types";
import { getBatchSegment } from "./constants";

/**
 * Compute a Batch status from its SPKs and whether it has been sent to QS.
 * Belum Dikirim -> Proses QS -> Selesai
 */
export function computeBatchStatus(
  _clusterCount: number,
  spks: Spk[],
  sentToQs: boolean
): StatusBatch {
  if (spks.length > 0 && spks.every((s) => s.status === "Selesai")) return "Selesai";
  if (sentToQs) return "Proses QS";
  return "Belum Dikirim";
}

/**
 * Compute the SPK status label.
 * Draft -> SPK Terbit -> Tagihan -> Selesai
 */
export function computeSpkStatus(spk: Spk | null | undefined): StatusSpk {
  if (!spk) return "Draft";
  if (spk.status === "Selesai") return "Selesai";
  if (spk.nomor_tagihan) return "Tagihan";
  if (spk.nomor_spk) return "SPK Terbit";
  return "Draft";
}

/**
 * Compute the Surat Jalan progress label inside a batch.
 * Menunggu QS -> Proses QS -> SPK Terbit -> Finished
 */
export function computeSJProgress(
  _sj: { spk_id?: string | null; status?: string | null },
  batchSentToQs: boolean,
  spkStatus: StatusSpk | null
): StatusSJ {
  if (spkStatus === "Selesai") return "Finished";
  if (spkStatus === "Tagihan" || spkStatus === "SPK Terbit") return "SPK Terbit";
  if (batchSentToQs) return "Proses QS";
  return "Menunggu QS";
}

export { getBatchSegment };
