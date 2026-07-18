export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = "ADMIN" | "OPERATOR" | "VIEWER";
type AnyRow = Record<string, any>;
type AnyTable = { Row: AnyRow; Insert: AnyRow; Update: AnyRow };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; full_name: string | null; role: AppRole; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; full_name?: string | null; role?: AppRole; created_at?: string; updated_at?: string };
        Update: { email?: string | null; full_name?: string | null; role?: AppRole; updated_at?: string };
      };
      master_cluster: AnyTable;
      master_kontraktor: AnyTable;
      master_vendor: AnyTable;
      surat_jalan: AnyTable;
      batch: AnyTable;
      spk: AnyTable;
      audit_log: AnyTable;
    };
    Views: Record<string, never>;
    Functions: {
      assign_surat_jalan_to_batch: { Args: { p_batch_id: string; p_surat_jalan_ids: string[] }; Returns: Json };
      create_batch_and_assign_surat_jalan: { Args: { p_bulan_batch: string; p_urutan_batch: number; p_tanggal_diterima: string; p_catatan: string | null; p_surat_jalan_ids: string[] }; Returns: Json };
      delete_surat_jalan_safely: { Args: { p_surat_jalan_ids: string[] }; Returns: Json };
      delete_batch_safely: { Args: { p_batch_id: string }; Returns: Json };
      refresh_batch_workflow_status: { Args: { p_batch_id: string }; Returns: string };
      send_batch_to_qs: { Args: { p_batch_id: string }; Returns: Json };
      issue_spk_for_batch_cluster: { Args: { p_batch_id: string; p_cluster_id: string; p_nomor_spk?: string; p_tanggal_spk?: string; p_nominal_spk?: number }; Returns: Json };
      submit_spk_invoice: { Args: { p_spk_id: string; p_nomor_tagihan: string; p_tanggal_tagihan: string; p_nominal_tagihan: number; p_catatan?: string | null }; Returns: Json };
      complete_spk_workflow: { Args: { p_spk_id: string }; Returns: Json };
      cancel_batch: { Args: { p_batch_id: string; p_reason?: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
