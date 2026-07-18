import { supabase } from "./supabase";
import type {
  AuditLog,
  Batch,
  MasterCluster,
  MasterKontraktor,
  MasterVendor,
  Spk,
  SuratJalan,
} from "./types";

export async function logActivity(aktivitas: string): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      aktivitas,
      user: "Admin Project",
    });
  } catch {
    // silent fail
  }
}

export async function fetchSuratJalan(): Promise<SuratJalan[]> {
  const { data, error } = await supabase
    .from("surat_jalan")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuratJalanWithRelations(): Promise<SuratJalan[]> {
  const { data, error } = await supabase
    .from("surat_jalan")
    .select(`
      *,
      vendor:master_vendor(*),
      cluster:master_cluster(*),
      kontraktor:master_kontraktor(*),
      batch:batch(*)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBatchs(): Promise<Batch[]> {
  const { data, error } = await supabase
    .from("batch")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBatchWithRelations(): Promise<Batch[]> {
  const { data, error } = await supabase
    .from("batch")
    .select(`
      *,
      surat_jalan(*),
      spk(*)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSpks(): Promise<Spk[]> {
  const { data, error } = await supabase
    .from("spk")
    .select(`
      *,
      batch:batch(*),
      cluster:master_cluster(*)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchVendors(): Promise<MasterVendor[]> {
  const { data, error } = await supabase
    .from("master_vendor")
    .select("*")
    .order("nama_vendor", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClusters(): Promise<MasterCluster[]> {
  const { data, error } = await supabase
    .from("master_cluster")
    .select("*")
    .order("nama_cluster", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchKontraktors(): Promise<MasterKontraktor[]> {
  const { data, error } = await supabase
    .from("master_kontraktor")
    .select("*")
    .order("nama_kontraktor", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("tanggal", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createSuratJalan(
  payload: Omit<SuratJalan, "id" | "created_at" | "total">
): Promise<SuratJalan | null> {
  const { data, error } = await supabase
    .from("surat_jalan")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSuratJalan(
  id: string,
  payload: Partial<SuratJalan>
): Promise<SuratJalan | null> {
  const { data, error } = await supabase
    .from("surat_jalan")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteSuratJalan(id: string): Promise<void> {
  const { error } = await supabase.from("surat_jalan").delete().eq("id", id);
  if (error) throw error;
}

export async function createBatch(
  payload: Omit<Batch, "id" | "created_at">
): Promise<Batch | null> {
  const { data, error } = await supabase
    .from("batch")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateBatch(
  id: string,
  payload: Partial<Batch>
): Promise<Batch | null> {
  const { data, error } = await supabase
    .from("batch")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteBatch(id: string): Promise<void> {
  const { error } = await supabase.from("batch").delete().eq("id", id);
  if (error) throw error;
}

export async function createSpk(
  payload: Omit<Spk, "id" | "created_at" | "updated_at">
): Promise<Spk | null> {
  const { data, error } = await supabase
    .from("spk")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSpk(
  id: string,
  payload: Partial<Spk>
): Promise<Spk | null> {
  const { data, error } = await supabase
    .from("spk")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteSpk(id: string): Promise<void> {
  const { error } = await supabase.from("spk").delete().eq("id", id);
  if (error) throw error;
}

export async function createVendor(
  payload: Omit<MasterVendor, "id" | "created_at">
): Promise<MasterVendor | null> {
  const { data, error } = await supabase
    .from("master_vendor")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateVendor(
  id: string,
  payload: Partial<MasterVendor>
): Promise<MasterVendor | null> {
  const { data, error } = await supabase
    .from("master_vendor")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from("master_vendor").delete().eq("id", id);
  if (error) throw error;
}

export async function createCluster(
  payload: Omit<MasterCluster, "id" | "created_at">
): Promise<MasterCluster | null> {
  const { data, error } = await supabase
    .from("master_cluster")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCluster(
  id: string,
  payload: Partial<MasterCluster>
): Promise<MasterCluster | null> {
  const { data, error } = await supabase
    .from("master_cluster")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteCluster(id: string): Promise<void> {
  const { error } = await supabase.from("master_cluster").delete().eq("id", id);
  if (error) throw error;
}

export async function createKontraktor(
  payload: Omit<MasterKontraktor, "id" | "created_at">
): Promise<MasterKontraktor | null> {
  const { data, error } = await supabase
    .from("master_kontraktor")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateKontraktor(
  id: string,
  payload: Partial<MasterKontraktor>
): Promise<MasterKontraktor | null> {
  const { data, error } = await supabase
    .from("master_kontraktor")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteKontraktor(id: string): Promise<void> {
  const { error } = await supabase.from("master_kontraktor").delete().eq("id", id);
  if (error) throw error;
}
