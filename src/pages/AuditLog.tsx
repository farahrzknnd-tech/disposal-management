import type { ColumnDef } from "@tanstack/react-table";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { useAuditLogs } from "@/hooks/useGlobalData";
import { exportToExcel, type ExportColumn } from "@/lib/export";
import { formatDateTime } from "@/lib/format";
import type { AuditLog as AuditLogType } from "@/lib/types";

export default function AuditLog() {
  const { data: logs = [], isLoading } = useAuditLogs();

  const columns: ColumnDef<AuditLogType>[] = [
    { accessorKey: "aktivitas", header: "Aktivitas" },
    { accessorKey: "user", header: "User" },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => formatDateTime(row.original.tanggal) },
  ];

  const handleExport = () => {
    const cols: ExportColumn<AuditLogType>[] = [
      { header: "Aktivitas", accessor: (r) => r.aktivitas },
      { header: "User", accessor: (r) => r.user },
      { header: "Tanggal", accessor: (r) => formatDateTime(r.tanggal) },
    ];
    exportToExcel(logs, cols, "Audit_Log");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Riwayat aktivitas sistem" />
      {isLoading ? (
        <TableSkeleton rows={10} cols={3} />
      ) : (
        <>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={logs}
            searchPlaceholder="Cari aktivitas atau user..."
            searchKeys={["aktivitas", "user"]}
          />
        </>
      )}
    </div>
  );
}
