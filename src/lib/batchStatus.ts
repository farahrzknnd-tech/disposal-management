import type { Spk, StatusBatch, StatusSJ, StatusSpk } from "./types";
import { getBatchSegment } from "./constants";
import { normalizeStatus } from "./status";

export function computeBatchStatus(
  clusterCount: number,
  spks: Spk[],
  sentToQs: boolean
): StatusBatch {
  if (clusterCount > 0 && spks.length >= clusterCount && spks.every((s) => normalizeStatus(s.status) === "COMPLETED")) return "COMPLETED";
  if (clusterCount > 0 && spks.length >= clusterCount && spks.every((s) => ["INVOICED", "COMPLETED"].includes(normalizeStatus(s.status)))) return "INVOICED";
  if (clusterCount > 0 && spks.length >= clusterCount) return "SPK_ISSUED";
  if (sentToQs) return "IN_QS_REVIEW";
  return "READY_FOR_QS";
}

export function computeSpkStatus(spk: Spk | null | undefined): StatusSpk {
  if (!spk) return "DRAFT";
  const status = normalizeStatus(spk.status);
  if (status !== "DRAFT") return status;
  if (spk.nomor_tagihan) return "INVOICED";
  if (spk.nomor_spk) return "SPK_ISSUED";
  return "DRAFT";
}

export function computeSJProgress(
  _sj: { spk_id?: string | null; status?: string | null },
  batchSentToQs: boolean,
  spkStatus: StatusSpk | null
): StatusSJ {
  if (spkStatus === "COMPLETED") return "Finished";
  if (spkStatus === "INVOICED" || spkStatus === "SPK_ISSUED") return "SPK Terbit";
  if (batchSentToQs) return "Proses QS";
  return "Menunggu QS";
}

export { getBatchSegment };
