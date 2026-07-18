import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { useSpks, useBatchs, useSuratJalan, useVendors, useClusters } from "@/hooks/useGlobalData";
import { exportToExcel, exportToPDF, printData, type ExportColumn } from "@/lib/export";
import { formatRupiah, formatDate } from "@/lib/format";
import { sumBy, groupBy } from "@/lib/utils";
import { FileDown, FileText, Printer } from "lucide-react";
import type { Spk, Batch, SuratJalan, MasterVendor, MasterCluster } from "@/lib/types";

export default function Laporan() {
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: batchs = [] } = useBatchs();
  const { data: spks = [] } = useSpks();
  const { data: vendors = [] } = useVendors();
  const { data: clusters = [] } = useClusters();

  const sjData = useMemo(() => suratJalans, [suratJalans]);
  const batchData = useMemo(() => batchs, [batchs]);
  const spkData = useMemo(() => spks, [spks]);
  const tagihanData = useMemo(() => spks.filter((s) => s.nomor_tagihan), [spks]);
  const outstandingData = useMemo(() => spks.filter((s) => s.status !== "Selesai"), [spks]);

  const vendorData = useMemo(() => {
    const groups = groupBy(suratJalans, (sj: SuratJalan) => sj.vendor_id ?? "unknown");
    return Object.entries(groups).map(([vendorId, sjs]) => {
      const vendor = vendors.find((v: MasterVendor) => v.id === vendorId);
      return {
        vendor: vendor?.nama_vendor ?? vendorId,
        jumlahSJ: sjs.length,
        totalPickup: sumBy(sjs, (sj: SuratJalan) => sj.pickup ?? 0),
        totalDamTruck: sumBy(sjs, (sj: SuratJalan) => sj.dam_truck ?? 0),
        totalNilai: sumBy(sjs, (sj: SuratJalan) => sj.total ?? 0),
      };
    });
  }, [suratJalans, vendors]);

  const clusterData = useMemo(() => {
    const groups = groupBy(suratJalans, (sj: SuratJalan) => sj.cluster_id ?? "unknown");
    return Object.entries(groups).map(([clusterId, sjs]) => {
      const cluster = clusters.find((c: MasterCluster) => c.id === clusterId);
      const clusterSpks = spks.filter((s: Spk) => s.cluster_id === clusterId);
      return {
        cluster: cluster?.nama_cluster ?? clusterId,
        jumlahSJ: sjs.length,
        jumlahSPK: clusterSpks.length,
        totalNilai: sumBy(sjs, (sj: SuratJalan) => sj.total ?? 0),
        outstanding: sumBy(clusterSpks.filter((s: Spk) => s.status !== "Selesai"), (s: Spk) => s.nominal_spk ?? 0),
      };
    });
  }, [suratJalans, clusters, spks]);

  const sjColumns: ColumnDef<SuratJalan>[] = [
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => formatDate(row.original.tanggal) },
    { accessorKey: "nomor_polisi", header: "Nomor Polisi", cell: ({ row }) => row.original.nomor_polisi ?? "-" },
    { id: "vendor", header: "Vendor", cell: ({ row }) => (row.original as SuratJalan & { vendor?: MasterVendor }).vendor?.nama_vendor ?? "-" },
    { id: "cluster", header: "Cluster", cell: ({ row }) => (row.original as SuratJalan & { cluster?: MasterCluster }).cluster?.nama_cluster ?? "-" },
    { accessorKey: "pickup", header: "Pickup" },
    { accessorKey: "dam_truck", header: "Dam Truck" },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatRupiah(row.original.total) },
  ];

  const batchColumns: ColumnDef<Batch>[] = [
    { accessorKey: "nama_batch", header: "Nama Batch" },
    { id: "periode", header: "Periode", cell: ({ row }) => `${formatDate(row.original.periode_awal)} - ${formatDate(row.original.periode_akhir)}` },
    { accessorKey: "status", header: "Status" },
    { id: "sj", header: "Jumlah SJ", cell: ({ row }) => (row.original as Batch & { surat_jalan?: unknown[] }).surat_jalan?.length ?? 0 },
    { id: "spk", header: "Jumlah SPK", cell: ({ row }) => (row.original as Batch & { spk?: unknown[] }).spk?.length ?? 0 },
  ];

  const spkColumns: ColumnDef<Spk>[] = [
    { accessorKey: "nomor_spk", header: "Nomor SPK", cell: ({ row }) => row.original.nomor_spk ?? "-" },
    { accessorKey: "tanggal_spk", header: "Tanggal SPK", cell: ({ row }) => formatDate(row.original.tanggal_spk) },
    { id: "cluster", header: "Cluster", cell: ({ row }) => (row.original as Spk & { cluster?: MasterCluster }).cluster?.nama_cluster ?? "-" },
    { accessorKey: "nominal_spk", header: "Nominal", cell: ({ row }) => formatRupiah(row.original.nominal_spk) },
    { accessorKey: "status", header: "Status" },
  ];

  const tagihanColumns: ColumnDef<Spk>[] = [
    { accessorKey: "nomor_tagihan", header: "Nomor Tagihan" },
    { accessorKey: "tanggal_tagihan", header: "Tanggal Tagihan", cell: ({ row }) => formatDate(row.original.tanggal_tagihan) },
    { id: "cluster", header: "Cluster", cell: ({ row }) => (row.original as Spk & { cluster?: MasterCluster }).cluster?.nama_cluster ?? "-" },
    { accessorKey: "nominal_tagihan", header: "Nominal", cell: ({ row }) => formatRupiah(row.original.nominal_tagihan) },
    { accessorKey: "status", header: "Status" },
  ];

  interface VendorRow { vendor: string; jumlahSJ: number; totalPickup: number; totalDamTruck: number; totalNilai: number; }
  const vendorColumns: ColumnDef<VendorRow>[] = [
    { accessorKey: "vendor", header: "Vendor" },
    { accessorKey: "jumlahSJ", header: "Jumlah SJ" },
    { accessorKey: "totalPickup", header: "Total Pickup" },
    { accessorKey: "totalDamTruck", header: "Total Dam Truck" },
    { accessorKey: "totalNilai", header: "Total Nilai", cell: ({ row }) => formatRupiah(row.original.totalNilai) },
  ];

  interface ClusterRow { cluster: string; jumlahSJ: number; jumlahSPK: number; totalNilai: number; outstanding: number; }
  const clusterColumns: ColumnDef<ClusterRow>[] = [
    { accessorKey: "cluster", header: "Cluster" },
    { accessorKey: "jumlahSJ", header: "Jumlah SJ" },
    { accessorKey: "jumlahSPK", header: "Jumlah SPK" },
    { accessorKey: "totalNilai", header: "Total Nilai", cell: ({ row }) => formatRupiah(row.original.totalNilai) },
    { accessorKey: "outstanding", header: "Outstanding", cell: ({ row }) => formatRupiah(row.original.outstanding) },
  ];

  const outstandingColumns: ColumnDef<Spk>[] = [
    { accessorKey: "nomor_spk", header: "Nomor SPK", cell: ({ row }) => row.original.nomor_spk ?? "-" },
    { accessorKey: "nominal_spk", header: "Nominal", cell: ({ row }) => formatRupiah(row.original.nominal_spk) },
    { id: "cluster", header: "Cluster", cell: ({ row }) => (row.original as Spk & { cluster?: MasterCluster }).cluster?.nama_cluster ?? "-" },
    { accessorKey: "status", header: "Status" },
  ];

  const sjExportCols: ExportColumn<SuratJalan>[] = [
    { header: "Tanggal", accessor: (r) => formatDate(r.tanggal) },
    { header: "Nomor Polisi", accessor: (r) => r.nomor_polisi ?? "-" },
    { header: "Pickup", accessor: (r) => r.pickup },
    { header: "Dam Truck", accessor: (r) => r.dam_truck },
    { header: "Total", accessor: (r) => formatRupiah(r.total) },
  ];

  const batchExportCols: ExportColumn<Batch>[] = [
    { header: "Nama Batch", accessor: (r) => r.nama_batch },
    { header: "Periode Awal", accessor: (r) => formatDate(r.periode_awal) },
    { header: "Periode Akhir", accessor: (r) => formatDate(r.periode_akhir) },
    { header: "Status", accessor: (r) => r.status },
  ];

  const spkExportCols: ExportColumn<Spk>[] = [
    { header: "Nomor SPK", accessor: (r) => r.nomor_spk ?? "-" },
    { header: "Tanggal SPK", accessor: (r) => formatDate(r.tanggal_spk) },
    { header: "Nominal SPK", accessor: (r) => formatRupiah(r.nominal_spk) },
    { header: "Status", accessor: (r) => r.status },
  ];

  const vendorExportCols: ExportColumn<VendorRow>[] = [
    { header: "Vendor", accessor: (r) => r.vendor },
    { header: "Jumlah SJ", accessor: (r) => r.jumlahSJ },
    { header: "Total Nilai", accessor: (r) => formatRupiah(r.totalNilai) },
  ];

  const clusterExportCols: ExportColumn<ClusterRow>[] = [
    { header: "Cluster", accessor: (r) => r.cluster },
    { header: "Jumlah SJ", accessor: (r) => r.jumlahSJ },
    { header: "Jumlah SPK", accessor: (r) => r.jumlahSPK },
    { header: "Total Nilai", accessor: (r) => formatRupiah(r.totalNilai) },
    { header: "Outstanding", accessor: (r) => formatRupiah(r.outstanding) },
  ];

  const outstandingExportCols: ExportColumn<Spk>[] = [
    { header: "Nomor SPK", accessor: (r) => r.nomor_spk ?? "-" },
    { header: "Nominal", accessor: (r) => formatRupiah(r.nominal_spk) },
    { header: "Status", accessor: (r) => r.status },
  ];

  const ExportButtons = <T,>({ data, cols, name, title }: { data: T[]; cols: ExportColumn<T>[]; name: string; title: string }) => (
    <div className="flex gap-2 mb-4">
      <Button size="sm" variant="outline" onClick={() => exportToExcel(data, cols, name)} className="gap-2"><FileDown className="h-4 w-4" /> Excel</Button>
      <Button size="sm" variant="outline" onClick={() => exportToPDF(data, cols, name, title)} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
      <Button size="sm" variant="outline" onClick={() => printData(data, cols, title)} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Berbagai jenis laporan" />
      <Tabs defaultValue="sj">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="sj">Laporan SJ</TabsTrigger>
          <TabsTrigger value="batch">Laporan Batch</TabsTrigger>
          <TabsTrigger value="spk">Laporan SPK</TabsTrigger>
          <TabsTrigger value="tagihan">Laporan Tagihan</TabsTrigger>
          <TabsTrigger value="vendor">Laporan Vendor</TabsTrigger>
          <TabsTrigger value="cluster">Laporan Cluster</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>
        <TabsContent value="sj" className="space-y-4">
          <ExportButtons data={sjData} cols={sjExportCols} name="Laporan_SJ" title="Laporan Surat Jalan" />
          <DataTable columns={sjColumns} data={sjData} searchPlaceholder="Cari nomor polisi..." searchKeys={["nomor_polisi"]} />
        </TabsContent>
        <TabsContent value="batch" className="space-y-4">
          <ExportButtons data={batchData} cols={batchExportCols} name="Laporan_Batch" title="Laporan Batch" />
          <DataTable columns={batchColumns} data={batchData} searchPlaceholder="Cari batch..." searchKeys={["nama_batch"]} />
        </TabsContent>
        <TabsContent value="spk" className="space-y-4">
          <ExportButtons data={spkData} cols={spkExportCols} name="Laporan_SPK" title="Laporan SPK" />
          <DataTable columns={spkColumns} data={spkData} searchPlaceholder="Cari SPK..." searchKeys={["nomor_spk"]} />
        </TabsContent>
        <TabsContent value="tagihan" className="space-y-4">
          <ExportButtons data={tagihanData} cols={spkExportCols} name="Laporan_Tagihan" title="Laporan Tagihan" />
          <DataTable columns={tagihanColumns} data={tagihanData} searchPlaceholder="Cari tagihan..." searchKeys={["nomor_tagihan"]} />
        </TabsContent>
        <TabsContent value="vendor" className="space-y-4">
          <ExportButtons data={vendorData} cols={vendorExportCols} name="Laporan_Vendor" title="Laporan Vendor" />
          <DataTable columns={vendorColumns} data={vendorData} searchPlaceholder="Cari vendor..." searchKeys={["vendor"]} />
        </TabsContent>
        <TabsContent value="cluster" className="space-y-4">
          <ExportButtons data={clusterData} cols={clusterExportCols} name="Laporan_Cluster" title="Laporan Cluster" />
          <DataTable columns={clusterColumns} data={clusterData} searchPlaceholder="Cari cluster..." searchKeys={["cluster"]} />
        </TabsContent>
        <TabsContent value="outstanding" className="space-y-4">
          <ExportButtons data={outstandingData} cols={outstandingExportCols} name="Laporan_Outstanding" title="Laporan Outstanding" />
          <DataTable columns={outstandingColumns} data={outstandingData} searchPlaceholder="Cari SPK..." searchKeys={["nomor_spk"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
