import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { useVendors, useKontraktors, useClusters, useSuratJalan, useSpks } from "@/hooks/useGlobalData";
import { formatRupiah } from "@/lib/format";
import { sumBy } from "@/lib/utils";
import type { MasterCluster, MasterKontraktor, MasterVendor, Spk, SuratJalan } from "@/lib/types";
import { exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export";
import { toast } from "sonner";

interface VendorRow { vendorName: string; sjCount: number; totalPickup: number; totalDamTruck: number; totalValue: number; percentage: number; }
interface KontraktorRow { kontraktorName: string; jobCount: number; totalValue: number; spkCount: number; }
interface ClusterRow { clusterName: string; spkCount: number; totalTagihan: number; outstanding: number; progressPercent: number; }

export default function PerformanceDashboard() {
  const { data: vendors = [] } = useVendors();
  const { data: kontraktors = [] } = useKontraktors();
  const { data: clusters = [] } = useClusters();
  const { data: suratJalan = [] } = useSuratJalan();
  const { data: spks = [] } = useSpks();

  const vendorPerformance = useMemo<VendorRow[]>(() => {
    const totalAllValue = sumBy(suratJalan, (sj: SuratJalan) => sj.total ?? 0);
    return vendors.map((vendor: MasterVendor) => {
      const vendorSJ = suratJalan.filter((sj: SuratJalan) => sj.vendor_id === vendor.id);
      const totalPickup = sumBy(vendorSJ, (sj: SuratJalan) => sj.pickup ?? 0);
      const totalDamTruck = sumBy(vendorSJ, (sj: SuratJalan) => sj.dam_truck ?? 0);
      const totalValue = sumBy(vendorSJ, (sj: SuratJalan) => sj.total ?? 0);
      const percentage = totalAllValue > 0 ? (totalValue / totalAllValue) * 100 : 0;
      return { vendorName: vendor.nama_vendor, sjCount: vendorSJ.length, totalPickup, totalDamTruck, totalValue, percentage };
    }).filter((v) => v.sjCount > 0);
  }, [vendors, suratJalan]);

  const kontraktorPerformance = useMemo<KontraktorRow[]>(() => {
    return kontraktors.map((kontraktor: MasterKontraktor) => {
      const kontraktorSJ = suratJalan.filter((sj: SuratJalan) => sj.kontraktor_id === kontraktor.id);
      const kontraktorSPK = spks.filter((spk: Spk) => spk.cluster_id === kontraktor.id);
      const totalValue = sumBy(kontraktorSJ, (sj: SuratJalan) => sj.total ?? 0);
      return { kontraktorName: kontraktor.nama_kontraktor, jobCount: kontraktorSJ.length, totalValue, spkCount: kontraktorSPK.length };
    }).filter((k) => k.jobCount > 0);
  }, [kontraktors, suratJalan, spks]);

  const clusterPerformance = useMemo<ClusterRow[]>(() => {
    return clusters.map((cluster: MasterCluster) => {
      const clusterSPK = spks.filter((spk: Spk) => spk.cluster_id === cluster.id);
      const totalTagihan = sumBy(clusterSPK, (spk: Spk) => spk.nominal_tagihan ?? 0);
      const totalNilaiSPK = sumBy(clusterSPK, (spk: Spk) => spk.nominal_spk ?? 0);
      const outstanding = totalNilaiSPK - totalTagihan;
      const progressPercent = totalNilaiSPK > 0 ? (totalTagihan / totalNilaiSPK) * 100 : 0;
      return { clusterName: cluster.nama_cluster, spkCount: clusterSPK.length, totalTagihan, outstanding, progressPercent };
    }).filter((c) => c.spkCount > 0);
  }, [clusters, spks]);

  const vendorColumns: ColumnDef<VendorRow>[] = [
    { accessorKey: "vendorName", header: "Vendor" },
    { accessorKey: "sjCount", header: "SJ Count" },
    { accessorKey: "totalPickup", header: "Total Pickup" },
    { accessorKey: "totalDamTruck", header: "Total Dam Truck" },
    { accessorKey: "totalValue", header: "Total Value", cell: ({ row }) => formatRupiah(row.original.totalValue) },
    { accessorKey: "percentage", header: "% of Total", cell: ({ row }) => `${row.original.percentage.toFixed(1)}%` },
  ];

  const kontraktorColumns: ColumnDef<KontraktorRow>[] = [
    { accessorKey: "kontraktorName", header: "Kontraktor" },
    { accessorKey: "jobCount", header: "Job Count" },
    { accessorKey: "totalValue", header: "Total Value", cell: ({ row }) => formatRupiah(row.original.totalValue) },
    { accessorKey: "spkCount", header: "SPK Count" },
  ];

  const clusterColumns: ColumnDef<ClusterRow>[] = [
    { accessorKey: "clusterName", header: "Cluster" },
    { accessorKey: "spkCount", header: "SPK Count" },
    { accessorKey: "totalTagihan", header: "Total Tagihan", cell: ({ row }) => formatRupiah(row.original.totalTagihan) },
    { accessorKey: "outstanding", header: "Outstanding", cell: ({ row }) => formatRupiah(row.original.outstanding) },
    { accessorKey: "progressPercent", header: "Progress %", cell: ({ row }) => `${row.original.progressPercent.toFixed(1)}%` },
  ];

  const makeExport = <T,>(data: T[], cols: ExportColumn<T>[], name: string, title: string) => ({
    excel: () => { exportToExcel(data, cols, name); toast.success("Excel diunduh"); },
    pdf: () => { exportToPDF(data, cols, name, title); toast.success("PDF diunduh"); },
  });

  const vendorExport = makeExport(vendorPerformance, [
    { header: "Vendor", accessor: (r) => r.vendorName },
    { header: "SJ Count", accessor: (r) => r.sjCount },
    { header: "Total Pickup", accessor: (r) => r.totalPickup },
    { header: "Total Dam Truck", accessor: (r) => r.totalDamTruck },
    { header: "Total Value", accessor: (r) => formatRupiah(r.totalValue) },
    { header: "% of Total", accessor: (r) => `${r.percentage.toFixed(1)}%` },
  ], "Vendor_Performance", "Vendor Performance");

  const kontraktorExport = makeExport(kontraktorPerformance, [
    { header: "Kontraktor", accessor: (r) => r.kontraktorName },
    { header: "Job Count", accessor: (r) => r.jobCount },
    { header: "Total Value", accessor: (r) => formatRupiah(r.totalValue) },
    { header: "SPK Count", accessor: (r) => r.spkCount },
  ], "Kontraktor_Performance", "Kontraktor Performance");

  const clusterExport = makeExport(clusterPerformance, [
    { header: "Cluster", accessor: (r) => r.clusterName },
    { header: "SPK Count", accessor: (r) => r.spkCount },
    { header: "Total Tagihan", accessor: (r) => formatRupiah(r.totalTagihan) },
    { header: "Outstanding", accessor: (r) => formatRupiah(r.outstanding) },
    { header: "Progress %", accessor: (r) => `${r.progressPercent.toFixed(1)}%` },
  ], "Cluster_Performance", "Cluster Performance");

  const ExportButtons = ({ excel, pdf }: { excel: () => void; pdf: () => void }) => (
    <div className="flex gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={excel} className="gap-2"><Download className="h-4 w-4" /> Excel</Button>
      <Button variant="outline" size="sm" onClick={pdf} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Performance Dashboard" description="Performa vendor, kontraktor, dan cluster" />
      <Tabs defaultValue="vendor">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
          <TabsTrigger value="kontraktor">Kontraktor</TabsTrigger>
          <TabsTrigger value="cluster">Cluster</TabsTrigger>
        </TabsList>
        <TabsContent value="vendor" className="mt-6">
          <ExportButtons excel={vendorExport.excel} pdf={vendorExport.pdf} />
          <DataTable columns={vendorColumns} data={vendorPerformance} searchPlaceholder="Cari vendor..." searchKeys={["vendorName"]} />
        </TabsContent>
        <TabsContent value="kontraktor" className="mt-6">
          <ExportButtons excel={kontraktorExport.excel} pdf={kontraktorExport.pdf} />
          <DataTable columns={kontraktorColumns} data={kontraktorPerformance} searchPlaceholder="Cari kontraktor..." searchKeys={["kontraktorName"]} />
        </TabsContent>
        <TabsContent value="cluster" className="mt-6">
          <ExportButtons excel={clusterExport.excel} pdf={clusterExport.pdf} />
          <DataTable columns={clusterColumns} data={clusterPerformance} searchPlaceholder="Cari cluster..." searchKeys={["clusterName"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
