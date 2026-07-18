import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { Batch, SuratJalan, Spk } from "@/lib/types";
import { useBatchs, useSuratJalan, useSpks, useClusters } from "@/hooks/useGlobalData";
import { formatRupiah } from "@/lib/format";
import { computeBatchStatus } from "@/lib/batchStatus";

interface BatchMonitoringRow extends Batch {
  sjCount: number;
  spkCount: number;
  spkCompletedCount: number;
  outstandingAmount: number;
  progressPercentage: number;
  computedStatus: string;
}

export default function Monitoring() {
  const { data: batchs = [], isLoading } = useBatchs();
  const { data: sjs = [] } = useSuratJalan();
  const { data: spks = [] } = useSpks();
  const { data: clusters = [] } = useClusters();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const monitoringData = useMemo<BatchMonitoringRow[]>(() => {
    return batchs.map((batch) => {
      const batchSjs = sjs.filter((sj: SuratJalan) => sj.batch_id === batch.id);
      const batchSpks = spks.filter((spk: Spk) => spk.batch_id === batch.id);
      const completedSpks = batchSpks.filter((spk: Spk) => spk.status === "Selesai");
      const outstandingAmount = batchSpks.reduce((sum, spk: Spk) => sum + ((spk.nominal_tagihan ?? spk.nominal_spk ?? 0) - 0), 0);
      const progressPercentage = batchSpks.length > 0 ? Math.round((completedSpks.length / batchSpks.length) * 100) : 0;
      const computedStatus = computeBatchStatus(clusters.length, batchSpks, !!batch.tanggal_kirim_qs);
      return {
        ...batch,
        sjCount: batchSjs.length,
        spkCount: batchSpks.length,
        spkCompletedCount: completedSpks.length,
        outstandingAmount,
        progressPercentage,
        computedStatus,
      };
    });
  }, [batchs, sjs, spks, clusters]);

  const filteredData = statusFilter === "all"
    ? monitoringData
    : monitoringData.filter((b) => b.computedStatus === statusFilter);

  const totalBatch = monitoringData.length;
  const totalSj = monitoringData.reduce((sum, b) => sum + b.sjCount, 0);
  const totalSpk = monitoringData.reduce((sum, b) => sum + b.spkCount, 0);
  const totalCompleted = monitoringData.reduce((sum, b) => sum + b.spkCompletedCount, 0);
  const totalOutstanding = monitoringData.reduce((sum, b) => sum + b.outstandingAmount, 0);

  const columns: ColumnDef<BatchMonitoringRow>[] = [
    { accessorKey: "nama_batch", header: "Nama Batch" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.computedStatus} />,
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Progress value={row.original.progressPercentage} className="h-2 flex-1" />
          <span className="text-xs font-medium w-10">{row.original.progressPercentage}%</span>
        </div>
      ),
    },
    { accessorKey: "sjCount", header: "SJ Count", cell: ({ row }) => <div className="text-right">{row.original.sjCount}</div> },
    { accessorKey: "spkCount", header: "SPK Count", cell: ({ row }) => <div className="text-right">{row.original.spkCount}</div> },
    { id: "spkCompleted", header: "SPK Selesai", cell: ({ row }) => <div className="text-right">{row.original.spkCompletedCount}/{row.original.spkCount}</div> },
    { accessorKey: "outstandingAmount", header: "Outstanding", cell: ({ row }) => <div className="text-right font-medium text-red-600">{formatRupiah(row.original.outstandingAmount)}</div> },
  ];

  const toolbar = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-40"><SelectValue placeholder="Filter Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        <SelectItem value="Draft">Draft</SelectItem>
        <SelectItem value="Dikirim ke QS">Dikirim ke QS</SelectItem>
        <SelectItem value="SPK Terbit">SPK Terbit</SelectItem>
        <SelectItem value="Tagihan Diserahkan">Tagihan Diserahkan</SelectItem>
        <SelectItem value="Selesai">Selesai</SelectItem>
      </SelectContent>
    </Select>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Monitoring" description="Monitoring status semua batch dan SPK" />
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Monitoring" description="Monitoring status semua batch dan SPK" />

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1">Total Batch</div><div className="text-2xl font-bold">{totalBatch}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1">Total SJ</div><div className="text-2xl font-bold">{totalSj}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1">Total SPK</div><div className="text-2xl font-bold">{totalSpk}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1">Total Selesai</div><div className="text-2xl font-bold text-green-600">{totalCompleted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1">Total Outstanding</div><div className="text-xl font-bold text-red-600">{formatRupiah(totalOutstanding)}</div></CardContent></Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="Cari nama batch..."
        searchKeys={["nama_batch"]}
        toolbar={toolbar}
        emptyComponent={<EmptyState title="Tidak ada batch" description="Belum ada data batch" />}
      />
    </div>
  );
}
