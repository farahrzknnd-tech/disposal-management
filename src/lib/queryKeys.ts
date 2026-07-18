export const queryKeys = {
  suratJalan: ['suratJalan'] as const,
  batches: ['batches'] as const,
  batchDetail: (id?: string | null) => ['batches', 'detail', id ?? ''] as const,
  spks: ['spks'] as const,
  spkDetail: (id?: string | null) => ['spks', 'detail', id ?? ''] as const,
  monitoring: ['monitoring'] as const,
  dashboard: ['dashboard'] as const,
  clusters: ['clusters'] as const,
  vendors: ['vendors'] as const,
  contractors: ['contractors'] as const,
  auditLogs: ['auditLogs'] as const,
};

export const affectedWorkflowQueries = [
  queryKeys.suratJalan,
  queryKeys.batches,
  queryKeys.spks,
  queryKeys.monitoring,
  queryKeys.dashboard,
] as const;
