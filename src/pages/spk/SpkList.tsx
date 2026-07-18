import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Spk, Batch, MasterCluster } from '@/lib/types';
import { computeSpkStatus } from '@/lib/batchStatus';
import { formatRupiah, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';

interface SpkRow {
  id: string;
  nomor_spk: string;
  batch_name: string;
  cluster_name: string;
  tanggal_spk: string;
  nominal_spk: string;
  status: string;
}

export default function SpkListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SpkRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: spks } = await supabase
        .from('spk')
        .select('*, batch:batch(*), cluster:master_cluster(*)')
        .order('created_at', { ascending: false });
      const spkList = (spks as unknown as (Spk & { batch?: Batch; cluster?: MasterCluster })[]) ?? [];
      setRows(
        spkList.map((s) => ({
          id: s.id,
          nomor_spk: s.nomor_spk ?? '-',
          batch_name: s.batch?.nama_batch ?? '-',
          cluster_name: s.cluster?.nama_cluster ?? '-',
          tanggal_spk: s.tanggal_spk ? formatDate(s.tanggal_spk) : '-',
          nominal_spk: formatRupiah(s.nominal_spk),
          status: computeSpkStatus(s),
        }))
      );
      setLoading(false);
    })();
  }, []);

  const columns: ColumnDef<SpkRow>[] = [
    { accessorKey: 'nomor_spk', header: 'Nomor SPK' },
    { accessorKey: 'batch_name', header: 'Batch' },
    { accessorKey: 'cluster_name', header: 'Cluster' },
    { accessorKey: 'tanggal_spk', header: 'Tanggal SPK' },
    {
      accessorKey: 'nominal_spk',
      header: 'Nominal SPK',
      cell: ({ row }) => <span className="font-medium">{row.original.nominal_spk}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      size: 100,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/spk/${row.original.id}`)}>
          <ChevronRight className="mr-1 h-4 w-4" /> Detail
        </Button>
      ),
    },
  ];

  function handleExport(format: 'excel' | 'pdf' | 'print') {
    const cols: ExportColumn<SpkRow>[] = [
      { header: 'Nomor SPK', accessor: (r) => r.nomor_spk },
      { header: 'Batch', accessor: (r) => r.batch_name },
      { header: 'Cluster', accessor: (r) => r.cluster_name },
      { header: 'Tanggal SPK', accessor: (r) => r.tanggal_spk },
      { header: 'Nominal SPK', accessor: (r) => r.nominal_spk },
      { header: 'Status', accessor: (r) => r.status },
    ];
    if (format === 'excel') exportToExcel(rows, cols, 'daftar-spk');
    else if (format === 'pdf') exportToPDF(rows, cols, 'daftar-spk', 'Daftar SPK');
    else printData(rows, cols, 'Daftar SPK');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master SPK"
        description="Daftar Surat Perintah Kerja (SPK) yang telah diterbitkan per batch dan cluster."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('print')}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total SPK', value: rows.length },
          { label: 'SPK Terbit', value: rows.filter((r) => r.status === 'SPK Terbit').length },
          { label: 'Tagihan', value: rows.filter((r) => r.status === 'Tagihan').length },
          { label: 'Selesai', value: rows.filter((r) => r.status === 'Selesai').length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Cari nomor SPK, batch, cluster..."
        searchKeys={['nomor_spk', 'batch_name', 'cluster_name']}
        emptyComponent={loading ? 'Memuat data...' : 'Belum ada SPK. Terbitkan SPK dari halaman Batch.'}
      />
    </div>
  );
}
