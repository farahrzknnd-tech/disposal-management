export const WORKFLOW_STATUSES = [
  "DRAFT",
  "READY_FOR_QS",
  "IN_QS_REVIEW",
  "SPK_ISSUED",
  "INVOICED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "Draft",
  READY_FOR_QS: "Siap Dikirim",
  IN_QS_REVIEW: "Proses QS",
  SPK_ISSUED: "SPK Terbit",
  INVOICED: "Ditagihkan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const LEGACY_STATUS_MAP: Record<string, WorkflowStatus> = {
  Draft: "DRAFT",
  "Belum Dikirim": "READY_FOR_QS",
  "Dikirim ke QS": "IN_QS_REVIEW",
  "Proses QS": "IN_QS_REVIEW",
  "SPK Terbit": "SPK_ISSUED",
  Tagihan: "INVOICED",
  "Tagihan Diserahkan": "INVOICED",
  Finished: "COMPLETED",
  Selesai: "COMPLETED",
};

export function normalizeStatus(status: string | null | undefined): WorkflowStatus {
  if (!status) return "DRAFT";
  if ((WORKFLOW_STATUSES as readonly string[]).includes(status)) return status as WorkflowStatus;
  return LEGACY_STATUS_MAP[status] ?? "DRAFT";
}

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[normalizeStatus(status)];
}

export function isStatus(status: string | null | undefined, expected: WorkflowStatus): boolean {
  return normalizeStatus(status) === expected;
}
