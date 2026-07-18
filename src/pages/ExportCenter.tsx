import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import {
  useSuratJalan,
  useBatchs,
  useSpks,
  useVendors,
  useClusters,
  useKontraktors,
  useAuditLogs,
} from "@/hooks/useGlobalData";
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  type ExportColumn,
} from "@/lib/export";
import { formatRupiah, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SuratJalan, Batch, Spk, MasterVendor, MasterCluster, MasterKontraktor, AuditLog } from "@/lib/types";

type DataType = "sj" | "batch" | "spk" | "tagihan" | "vendor" | "cluster" | "kontraktor" | "auditlog";
type ExportFormat = "excel" | "pdf" | "csv";

interface ExportState {
  dataType: DataType;
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  selectedCluster: string;
  selectedVendor: string;
  selectedStatus: string;
}

interface SjRow {
  tanggal: string;
  nomor_polisi: string | null;
  vendor: string;
  cluster: string;
  pickup: number;
  dam_truck: number;
  total: number;
}

interface BatchRow {
  nama_batch: string;
  periode: string;
  status: string;
}

interface SpkRow {
  nomor_spk: string | null;
  tanggal_spk: string | null;
  cluster: string;
  nominal_spk: number | null;
  status: string;
}

interface TagihanRow {
  nomor_tagihan: string | null;
  tanggal_tagihan: string | null;
  cluster: string;
  nominal_tagihan: number | null;
  status: string;
}

interface VendorRow {
  nama_vendor: string;
  status: string;
}

interface ClusterRow {
  nama_cluster: string;
  status: string;
}

interface KontraktorRow {
  nama_kontraktor: string;
  alamat: string | null;
  telepon: string | null;
  status: string;
}

interface AuditLogRow {
  aktivitas: string;
  user: string;
  tanggal: string;
}

export default function ExportCenter() {
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: batchs = [] } = useBatchs();
  const { data: spks = [] } = useSpks();
  const { data: vendors = [] } = useVendors();
  const { data: clusters = [] } = useClusters();
  const { data: kontraktors = [] } = useKontraktors();
  const { data: auditLogs = [] } = useAuditLogs();

  const [exportState, setExportState] = useState<ExportState>({
    dataType: "sj",
    format: "excel",
    dateFrom: "",
    dateTo: "",
    selectedCluster: "",
    selectedVendor: "",
    selectedStatus: "",
  });

  const filteredData = useMemo(() => {
    if (exportState.dataType === "sj") {
      let data = suratJalans as (SuratJalan & { vendor?: MasterVendor; cluster?: MasterCluster })[];
      if (exportState.selectedVendor) data = data.filter((item) => item.vendor_id === exportState.selectedVendor);
      if (exportState.selectedCluster) data = data.filter((item) => item.cluster_id === exportState.selectedCluster);
      if (exportState.dateFrom) data = data.filter((item) => (item.tanggal ?? "") >= exportState.dateFrom);
      if (exportState.dateTo) data = data.filter((item) => (item.tanggal ?? "") <= exportState.dateTo);
      return data.map((item): SjRow => ({
        tanggal: item.tanggal,
        nomor_polisi: item.nomor_polisi,
        vendor: item.vendor?.nama_vendor ?? "-",
        cluster: item.cluster?.nama_cluster ?? "-",
        pickup: item.pickup,
        dam_truck: item.dam_truck,
        total: item.total,
      }));
    }
    if (exportState.dataType === "batch") {
      let data = batchs as (Batch & { surat_jalan?: unknown[]; spk?: unknown[] })[];
      if (exportState.selectedStatus) data = data.filter((item) => item.status === exportState.selectedStatus);
      return data.map((item): BatchRow => ({
        nama_batch: item.nama_batch,
        periode: `${item.periode_awal ?? "-"} - ${item.periode_akhir ?? "-"}`,
        status: item.status,
      }));
    }
    if (exportState.dataType === "spk") {
      let data = spks as (Spk & { cluster?: MasterCluster })[];
      if (exportState.selectedCluster) data = data.filter((item) => item.cluster_id === exportState.selectedCluster);
      if (exportState.selectedStatus) data = data.filter((item) => item.status === exportState.selectedStatus);
      if (exportState.dateFrom) data = data.filter((item) => (item.tanggal_spk ?? "") >= exportState.dateFrom);
      if (exportState.dateTo) data = data.filter((item) => (item.tanggal_spk ?? "") <= exportState.dateTo);
      return data.map((item): SpkRow => ({
        nomor_spk: item.nomor_spk,
        tanggal_spk: item.tanggal_spk,
        cluster: item.cluster?.nama_cluster ?? "-",
        nominal_spk: item.nominal_spk,
        status: item.status,
      }));
    }
    if (exportState.dataType === "tagihan") {
      let data = spks.filter((s) => s.nomor_tagihan) as (Spk & { cluster?: MasterCluster })[];
      if (exportState.selectedCluster) data = data.filter((item) => item.cluster_id === exportState.selectedCluster);
      if (exportState.selectedStatus) data = data.filter((item) => item.status === exportState.selectedStatus);
      if (exportState.dateFrom) data = data.filter((item) => (item.tanggal_tagihan ?? "") >= exportState.dateFrom);
      if (exportState.dateTo) data = data.filter((item) => (item.tanggal_tagihan ?? "") <= exportState.dateTo);
      return data.map((item): TagihanRow => ({
        nomor_tagihan: item.nomor_tagihan,
        tanggal_tagihan: item.tanggal_tagihan,
        cluster: item.cluster?.nama_cluster ?? "-",
        nominal_tagihan: item.nominal_tagihan,
        status: item.status,
      }));
    }
    if (exportState.dataType === "vendor") {
      return vendors.map((v: MasterVendor): VendorRow => ({ nama_vendor: v.nama_vendor, status: v.status }));
    }
    if (exportState.dataType === "cluster") {
      return clusters.map((c: MasterCluster): ClusterRow => ({ nama_cluster: c.nama_cluster, status: c.status }));
    }
    if (exportState.dataType === "kontraktor") {
      return kontraktors.map((k: MasterKontraktor): KontraktorRow => ({ nama_kontraktor: k.nama_kontraktor, alamat: k.alamat, telepon: k.telepon, status: k.status }));
    }
    if (exportState.dataType === "auditlog") {
      let data = auditLogs as AuditLog[];
      if (exportState.dateFrom) data = data.filter((item) => (item.tanggal ?? "") >= exportState.dateFrom);
      if (exportState.dateTo) data = data.filter((item) => (item.tanggal ?? "") <= exportState.dateTo);
      return data.map((item): AuditLogRow => ({ aktivitas: item.aktivitas, user: item.user, tanggal: item.tanggal }));
    }
    return [];
  }, [
    exportState.dataType, exportState.dateFrom, exportState.dateTo,
    exportState.selectedCluster, exportState.selectedVendor, exportState.selectedStatus,
    suratJalans, batchs, spks, vendors, clusters, kontraktors, auditLogs,
  ]);

  const sjColumns: ColumnDef<SjRow>[] = [
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => formatDate(row.original.tanggal) },
    { accessorKey: "nomor_polisi", header: "Nomor Polisi", cell: ({ row }) => row.original.nomor_polisi ?? "-" },
    { accessorKey: "vendor", header: "Vendor" },
    { accessorKey: "cluster", header: "Cluster" },
    { accessorKey: "pickup", header: "Pickup" },
    { accessorKey: "dam_truck", header: "Dam Truck" },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatRupiah(row.original.total) },
  ];
  const batchColumns: ColumnDef<BatchRow>[] = [
    { accessorKey: "nama_batch", header: "Nama Batch" },
    { accessorKey: "periode", header: "Periode" },
    { accessorKey: "status", header: "Status" },
  ];
  const spkColumns: ColumnDef<SpkRow>[] = [
    { accessorKey: "nomor_spk", header: "Nomor SPK", cell: ({ row }) => row.original.nomor_spk ?? "-" },
    { accessorKey: "tanggal_spk", header: "Tanggal SPK", cell: ({ row }) => formatDate(row.original.tanggal_spk) },
    { accessorKey: "cluster", header: "Cluster" },
    { accessorKey: "nominal_spk", header: "Nominal", cell: ({ row }) => formatRupiah(row.original.nominal_spk) },
    { accessorKey: "status", header: "Status" },
  ];
  const tagihanColumns: ColumnDef<TagihanRow>[] = [
    { accessorKey: "nomor_tagihan", header: "Nomor Tagihan" },
    { accessorKey: "tanggal_tagihan", header: "Tanggal Tagihan", cell: ({ row }) => formatDate(row.original.tanggal_tagihan) },
    { accessorKey: "cluster", header: "Cluster" },
    { accessorKey: "nominal_tagihan", header: "Nominal", cell: ({ row }) => formatRupiah(row.original.nominal_tagihan) },
    { accessorKey: "status", header: "Status" },
  ];
  const vendorColumns: ColumnDef<VendorRow>[] = [
    { accessorKey: "nama_vendor", header: "Nama Vendor" },
    { accessorKey: "status", header: "Status" },
  ];
  const clusterColumns: ColumnDef<ClusterRow>[] = [
    { accessorKey: "nama_cluster", header: "Nama Cluster" },
    { accessorKey: "status", header: "Status" },
  ];
  const kontraktorColumns: ColumnDef<KontraktorRow>[] = [
    { accessorKey: "nama_kontraktor", header: "Nama Kontraktor" },
    { accessorKey: "alamat", header: "Alamat", cell: ({ row }) => row.original.alamat ?? "-" },
    { accessorKey: "telepon", header: "Telepon", cell: ({ row }) => row.original.telepon ?? "-" },
    { accessorKey: "status", header: "Status" },
  ];
  const auditLogColumns: ColumnDef<AuditLogRow>[] = [
    { accessorKey: "aktivitas", header: "Aktivitas" },
    { accessorKey: "user", header: "User" },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => formatDate(row.original.tanggal) },
  ];

  const columnsMap: Record<DataType, ColumnDef<unknown>[]> = {
    sj: sjColumns as ColumnDef<unknown>[],
    batch: batchColumns as ColumnDef<unknown>[],
    spk: spkColumns as ColumnDef<unknown>[],
    tagihan: tagihanColumns as ColumnDef<unknown>[],
    vendor: vendorColumns as ColumnDef<unknown>[],
    cluster: clusterColumns as ColumnDef<unknown>[],
    kontraktor: kontraktorColumns as ColumnDef<unknown>[],
    auditlog: auditLogColumns as ColumnDef<unknown>[],
  };

  const exportColsMap: Record<DataType, ExportColumn<unknown>[]> = {
    sj: [
      { header: "Tanggal", accessor: (r: unknown) => formatDate((r as SjRow).tanggal) },
      { header: "Nomor Polisi", accessor: (r: unknown) => (r as SjRow).nomor_polisi ?? "-" },
      { header: "Vendor", accessor: (r: unknown) => (r as SjRow).vendor },
      { header: "Cluster", accessor: (r: unknown) => (r as SjRow).cluster },
      { header: "Pickup", accessor: (r: unknown) => (r as SjRow).pickup },
      { header: "Dam Truck", accessor: (r: unknown) => (r as SjRow).dam_truck },
      { header: "Total", accessor: (r: unknown) => formatRupiah((r as SjRow).total) },
    ],
    batch: [
      { header: "Nama Batch", accessor: (r: unknown) => (r as BatchRow).nama_batch },
      { header: "Periode", accessor: (r: unknown) => (r as BatchRow).periode },
      { header: "Status", accessor: (r: unknown) => (r as BatchRow).status },
    ],
    spk: [
      { header: "Nomor SPK", accessor: (r: unknown) => (r as SpkRow).nomor_spk ?? "-" },
      { header: "Tanggal SPK", accessor: (r: unknown) => formatDate((r as SpkRow).tanggal_spk) },
      { header: "Cluster", accessor: (r: unknown) => (r as SpkRow).cluster },
      { header: "Nominal", accessor: (r: unknown) => formatRupiah((r as SpkRow).nominal_spk) },
      { header: "Status", accessor: (r: unknown) => (r as SpkRow).status },
    ],
    tagihan: [
      { header: "Nomor Tagihan", accessor: (r: unknown) => (r as TagihanRow).nomor_tagihan ?? "-" },
      { header: "Tanggal Tagihan", accessor: (r: unknown) => formatDate((r as TagihanRow).tanggal_tagihan) },
      { header: "Cluster", accessor: (r: unknown) => (r as TagihanRow).cluster },
      { header: "Nominal", accessor: (r: unknown) => formatRupiah((r as TagihanRow).nominal_tagihan) },
      { header: "Status", accessor: (r: unknown) => (r as TagihanRow).status },
    ],
    vendor: [
      { header: "Nama Vendor", accessor: (r: unknown) => (r as VendorRow).nama_vendor },
      { header: "Status", accessor: (r: unknown) => (r as VendorRow).status },
    ],
    cluster: [
      { header: "Nama Cluster", accessor: (r: unknown) => (r as ClusterRow).nama_cluster },
      { header: "Status", accessor: (r: unknown) => (r as ClusterRow).status },
    ],
    kontraktor: [
      { header: "Nama Kontraktor", accessor: (r: unknown) => (r as KontraktorRow).nama_kontraktor },
      { header: "Alamat", accessor: (r: unknown) => (r as KontraktorRow).alamat ?? "-" },
      { header: "Telepon", accessor: (r: unknown) => (r as KontraktorRow).telepon ?? "-" },
      { header: "Status", accessor: (r: unknown) => (r as KontraktorRow).status },
    ],
    auditlog: [
      { header: "Aktivitas", accessor: (r: unknown) => (r as AuditLogRow).aktivitas },
      { header: "User", accessor: (r: unknown) => (r as AuditLogRow).user },
      { header: "Tanggal", accessor: (r: unknown) => formatDate((r as AuditLogRow).tanggal) },
    ],
  };

  const titleMap: Record<DataType, string> = {
    sj: "Laporan Surat Jalan",
    batch: "Laporan Batch",
    spk: "Laporan SPK",
    tagihan: "Laporan Tagihan",
    vendor: "Data Vendor",
    cluster: "Data Cluster",
    kontraktor: "Data Kontraktor",
    auditlog: "Audit Log",
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const fileName = `Export_${exportState.dataType}`;
    const exportColumns = exportColsMap[exportState.dataType];
    const title = titleMap[exportState.dataType];

    if (exportState.format === "excel") {
      exportToExcel(filteredData, exportColumns, fileName);
    } else if (exportState.format === "pdf") {
      exportToPDF(filteredData, exportColumns, fileName, title);
    } else {
      exportToCSV(filteredData, exportColumns, fileName);
    }

    toast.success(`Data berhasil diekspor ke ${exportState.format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Export Center" description="Pusat ekspor data" />

      <Card>
        <CardHeader><CardTitle className="text-base">Opsi Ekspor</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="data-type">Tipe Data</Label>
              <select
                id="data-type"
                value={exportState.dataType}
                onChange={(e) => setExportState({ ...exportState, dataType: e.target.value as DataType })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="sj">Surat Jalan</option>
                <option value="batch">Batch</option>
                <option value="spk">SPK</option>
                <option value="tagihan">Tagihan</option>
                <option value="vendor">Vendor</option>
                <option value="cluster">Cluster</option>
                <option value="kontraktor">Kontraktor</option>
                <option value="auditlog">Audit Log</option>
              </select>
            </div>
            <div>
              <Label htmlFor="export-format">Format Ekspor</Label>
              <select
                id="export-format"
                value={exportState.format}
                onChange={(e) => setExportState({ ...exportState, format: e.target.value as ExportFormat })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Filter Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["sj", "spk", "tagihan", "auditlog"].includes(exportState.dataType) && (
                <>
                  <div>
                    <Label htmlFor="date-from">Dari Tanggal</Label>
                    <Input id="date-from" type="date" value={exportState.dateFrom} onChange={(e) => setExportState({ ...exportState, dateFrom: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="date-to">Hingga Tanggal</Label>
                    <Input id="date-to" type="date" value={exportState.dateTo} onChange={(e) => setExportState({ ...exportState, dateTo: e.target.value })} />
                  </div>
                </>
              )}

              {["sj", "spk", "tagihan"].includes(exportState.dataType) && (
                <div>
                  <Label htmlFor="cluster-filter">Cluster</Label>
                  <select
                    id="cluster-filter"
                    value={exportState.selectedCluster}
                    onChange={(e) => setExportState({ ...exportState, selectedCluster: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Semua Cluster</option>
                    {clusters.map((c) => (
                      <option key={c.id} value={c.id}>{c.nama_cluster}</option>
                    ))}
                  </select>
                </div>
              )}

              {exportState.dataType === "sj" && (
                <div>
                  <Label htmlFor="vendor-filter">Vendor</Label>
                  <select
                    id="vendor-filter"
                    value={exportState.selectedVendor}
                    onChange={(e) => setExportState({ ...exportState, selectedVendor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Semua Vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama_vendor}</option>
                    ))}
                  </select>
                </div>
              )}

              {["spk", "tagihan", "batch"].includes(exportState.dataType) && (
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <select
                    id="status-filter"
                    value={exportState.selectedStatus}
                    onChange={(e) => setExportState({ ...exportState, selectedStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Semua Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Dikirim ke QS">Dikirim ke QS</option>
                    <option value="SPK Terbit">SPK Terbit</option>
                    <option value="Tagihan Diserahkan">Tagihan Diserahkan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <Button onClick={handleExport} size="lg" className="gap-2">
              <FileDown className="h-4 w-4" />
              Ekspor Data ({filteredData.length} item)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Preview Data</h3>
        <DataTable
          columns={columnsMap[exportState.dataType]}
          data={filteredData}
          searchPlaceholder="Cari data..."
        />
      </div>
    </div>
  );
}
