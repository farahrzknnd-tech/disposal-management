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
import { queryKeys } from "@/lib/queryKeys";

export function useSuratJalan() {
  return useQuery({ queryKey: queryKeys.suratJalan, queryFn: fetchSuratJalanWithRelations });
}

export function useBatchs() {
  return useQuery({ queryKey: queryKeys.batches, queryFn: fetchBatchWithRelations });
}

export function useSpks() {
  return useQuery({ queryKey: queryKeys.spks, queryFn: fetchSpks });
}

export function useVendors() {
  return useQuery({ queryKey: queryKeys.vendors, queryFn: fetchVendors });
}

export function useClusters() {
  return useQuery({ queryKey: queryKeys.clusters, queryFn: fetchClusters });
}

export function useKontraktors() {
  return useQuery({ queryKey: queryKeys.contractors, queryFn: fetchKontraktors });
}

export function useAuditLogs() {
  return useQuery({ queryKey: queryKeys.auditLogs, queryFn: fetchAuditLogs });
}
