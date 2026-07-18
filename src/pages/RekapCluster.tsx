import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { useClusters, useSpks, useSuratJalan } from "@/hooks/useGlobalData";
import { formatRupiah } from "@/lib/format";
import { sumBy } from "@/lib/utils";
import type { MasterCluster, Spk, SuratJalan } from "@/lib/types";
import { exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export";
import { toast } from "sonner";

interface ClusterRekapRow {
  clusterId: string;
  clusterName: string;
  jumlahSJ: number;
  jumlahSPK: number;
  totalPickup: number;
  totalDamTruck: number;
  nilaiSPK: number;
  nilaiTagihan: number;
  outstanding: number;
}

export default function RekapCluster() {
  const { data: clusters = [] } = useClusters();
  const { data: spks = [] } = useSpks();
  const { data: suratJalan = [] } = useSuratJalan();

  const rekapData = useMemo<ClusterRekapRow[]>(() => {
    return clusters.map((cluster: MasterCluster) => {
      const clusterSJ = suratJalan.filter((sj: SuratJalan) => sj.cluster_id === cluster.id);
      const clusterSPK = spks.filter((spk: Spk) => spk.cluster_id === cluster.id);
      const totalPickup = sumBy(clusterSJ, (sj: SuratJalan) => sj.pickup ?? 0);
      const totalDamTruck = sumBy(clusterSJ, (sj: SuratJalan) => sj.dam_truck ?? 0);
      const nilaiSPK = sumBy(clusterSPK, (spk: Spk) => spk.nominal_spk ?? 0);
      const nilaiTagihan = sumBy(clusterSPK, (spk: Spk) => spk.nominal_tagihan ?? 0);
      const outstanding = nilaiSPK - nilaiTagihan;
      return {
        clusterId: cluster.id,
        clusterName: cluster.nama_cluster,
        jumlahSJ: clusterSJ.length,
        jumlahSPK: clusterSPK.length,
        totalPickup,
        totalDamTruck,
        nilaiSPK,
        nilaiTagihan,
        outstanding,
      };
    });
  }, [clusters, spks, suratJalan]);

  const summary = useMemo(() => ({
    totalCluster: rekapData.length,
    totalSJ: sumBy(rekapData, (r) => r.jumlahSJ),
    totalSPK: sumBy(rekapData, (r) => r.jumlahSPK),
    totalNilaiTagihan: sumBy(rekapData, (r) => r.nilaiTagihan),
  }), [rekapData]);

  const columns: ColumnDef<ClusterRekapRow>[] = [
    { accessorKey: "clusterName", header: "Cluster" },
    { accessorKey: "jumlahSJ", header: "Jumlah SJ" },
    { accessorKey: "jumlahSPK", header: "Jumlah SPK" },
    { accessorKey: "totalPickup", header: "Total Pickup" },
    { accessorKey: "totalDamTruck", header: "Total Dam Truck" },
    { accessorKey: "nilaiSPK", header: "Nilai SPK", cell: ({ row }) => formatRupiah(row.original.nilaiSPK) },
    { accessorKey: "nilaiTagihan", header: "Nilai Tagihan", cell: ({ row }) => formatRupiah(row.original.nilaiTagihan) },
    { accessorKey: "outstanding", header: "Outstanding", cell: ({ row }) => formatRupiah(row.original.outstanding) },
  ];

  const exportCols: ExportColumn<ClusterRekapRow>[] = [
    { header: "Cluster", accessor: (r) => r.clusterName },
    { header: "Jumlah SJ", accessor: (r) => r.jumlahSJ },
    { header: "Jumlah SPK", accessor: (r) => r.jumlahSPK },
    { header: "Total Pickup", accessor: (r) => r.totalPickup },
    { header: "Total Dam Truck", accessor: (r) => r.totalDamTruck },
    { header: "Nilai SPK", accessor: (r) => formatRupiah(r.nilaiSPK) },
    { header: "Nilai Tagihan", accessor: (r) => formatRupiah(r.nilaiTagihan) },
    { header: "Outstanding", accessor: (r) => formatRupiah(r.outstanding) },
  ];

  const handleExportExcel = () => {
    exportToExcel(rekapData, exportCols, "Rekap_Cluster");
    toast.success("Excel berhasil diunduh");
  };

  const handleExportPDF = () => {
    exportToPDF(rekapData, exportCols, "Rekap_Cluster", "Laporan Rekap Cluster");
    toast.success("PDF berhasil diunduh");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekap Cluster"
        description="Rekapitulasi data per cluster"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2"><Download className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Total Cluster</p><p className="text-2xl font-bold">{summary.totalCluster}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Total SJ</p><p className="text-2xl font-bold">{summary.totalSJ}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Total SPK</p><p className="text-2xl font-bold">{summary.totalSPK}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Total Nilai Tagihan</p><p className="text-2xl font-bold">{formatRupiah(summary.totalNilaiTagihan)}</p></CardContent></Card>
      </div>

      <DataTable columns={columns} data={rekapData} searchPlaceholder="Cari cluster..." searchKeys={["clusterName"]} />
    </div>
  );
}
