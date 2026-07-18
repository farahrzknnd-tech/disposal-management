import { supabase } from "./supabase";
import { buildBatchName, getBatchPeriod } from "./constants";
import type { Batch } from "./types";

/**
 * Find or create the automatic batch for a given date.
 * Batches are segmented: days 1-15 = I, days 16-end = II.
 * Naming: "Batch Juli I 2026".
 */
export async function findOrCreateAutoBatch(date: string): Promise<Batch | null> {
  const { awal, akhir } = getBatchPeriod(date);
  const nama_batch = buildBatchName(date);

  // Look for an existing batch with the same name (unique per month+segment)
  const { data: existing } = await supabase
    .from("batch")
    .select("*")
    .eq("nama_batch", nama_batch)
    .maybeSingle();

  if (existing) return existing as Batch;

  const { data, error } = await supabase
    .from("batch")
    .insert({
      nama_batch,
      periode_awal: awal,
      periode_akhir: akhir,
      status: "Belum Dikirim",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to create auto batch", error);
    return null;
  }
  return data as Batch | null;
}

/**
 * Assign a set of Surat Jalan ids to their automatic batch based on each SJ's tanggal.
 * Returns the set of batch ids touched.
 */
export async function assignSuratJalanToAutoBatch(sjIds: string[]): Promise<Set<string>> {
  const touched = new Set<string>();
  if (sjIds.length === 0) return touched;

  const { data: sjs, error } = await supabase
    .from("surat_jalan")
    .select("id, tanggal")
    .in("id", sjIds);

  if (error || !sjs) return touched;

  for (const sj of sjs) {
    const batch = await findOrCreateAutoBatch(sj.tanggal);
    if (!batch) continue;
    await supabase
      .from("surat_jalan")
      .update({
        batch_id: batch.id,
        tanggal_batch: sj.tanggal,
      })
      .eq("id", sj.id);
    touched.add(batch.id);
  }
  return touched;
}

/**
 * Remove Surat Jalan from their batch (unassign).
 */
export async function unassignSuratJalanFromBatch(sjIds: string[]): Promise<void> {
  if (sjIds.length === 0) return;
  await supabase
    .from("surat_jalan")
    .update({ batch_id: null, tanggal_batch: null, spk_id: null })
    .in("id", sjIds);
}

/**
 * Send a batch to QS: set status to "Proses QS" and store tanggal_kirim_qs.
 * Also update all its Surat Jalan to "Proses QS".
 */
export async function sendBatchToQs(batchId: string): Promise<boolean> {
  const { error } = await supabase
    .from("batch")
    .update({
      status: "Proses QS",
      tanggal_kirim_qs: new Date().toISOString().slice(0, 10),
    })
    .eq("id", batchId);
  if (error) return false;
  await supabase
    .from("surat_jalan")
    .update({ status: "Proses QS" })
    .eq("batch_id", batchId);
  return true;
}
