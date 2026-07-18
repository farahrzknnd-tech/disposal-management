import { useQuery } from "@tanstack/react-query";
import {
  fetchSuratJalanWithRelations,
  fetchBatchWithRelations,
  fetchSpks,
  fetchVendors,
  fetchClusters,
  fetchKontraktors,
  fetchAuditLogs,
} from "@/lib/api";

export function useSuratJalan() {
  return useQuery({ queryKey: ["surat-jalan"], queryFn: fetchSuratJalanWithRelations });
}

export function useBatchs() {
  return useQuery({ queryKey: ["batchs"], queryFn: fetchBatchWithRelations });
}

export function useSpks() {
  return useQuery({ queryKey: ["spks"], queryFn: fetchSpks });
}

export function useVendors() {
  return useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });
}

export function useClusters() {
  return useQuery({ queryKey: ["clusters"], queryFn: fetchClusters });
}

export function useKontraktors() {
  return useQuery({ queryKey: ["kontraktors"], queryFn: fetchKontraktors });
}

export function useAuditLogs() {
  return useQuery({ queryKey: ["audit-logs"], queryFn: fetchAuditLogs });
}
