import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight, Trash2, Send, FileSignature, Download, FileText, Printer } from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type { Batch, SuratJalan, Spk } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatRupiah } from '@/lib/format';
import { hitungEstimasi } from '@/lib/constants';
import { sendBatchToQs } from '@/lib/batchService';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { isStatus } from '@/lib/status';
import { deleteReadyBatch, getWorkflowErrorMessage } from '@/lib/workflows';
import { affectedWorkflowQueries } from '@/lib/queryKeys';

interface BatchRow extends Batch {
  surat_jalan_count: number;
  total_pickup: number;
  total_dam_truck: number;
  estimasi: number;
  cluster_count: number;
  spk_count: number;
}

export default function BatchListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: batches } = await supabase
      .from('batch')
      .select('*')
      .order('created_at', { ascending: false });
    const batchList = (batches as Batch[]) ?? [];
    if (batchList.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = batchList.map((b) => b.id);
    const [sjRes, spkRes] = await Promise.all([
      supabase.from('surat_jalan').select('*').in('batch_id', ids),
      supabase.from('spk').select('*').in('batch_id', ids),
    ]);
    const sjByBatch: Record<string, SuratJalan[]> = {};
    (sjRes.data ?? []).forEach((s: any) => {
      const sj = s as SuratJalan;
      if (!sj.batch_id) return;
      (sjByBatch[sj.batch_id] ??= []).push(sj);
    });
    const spkByBatch: Record<string, Spk[]> = {};
    (spkRes.data ?? []).forEach((s: any) => {
      const spk = s as Spk;
      (spkByBatch[spk.batch_id] ??= []).push(spk);
    });
    setRows(
      batchList.map((b) => {
        const items = sjByBatch[b.id] ?? [];
        const pickup = items.reduce((acc, s) => acc + (s.pickup ?? 0), 0);
        const damTruck = items.reduce((acc, s) => acc + (s.dam_truck ?? 0), 0);
        const clusterIds = new Set(items.map((s) => s.cluster_id).filter(Boolean));
        return {
          ...b,
          surat_jalan_count: items.length,
          total_pickup: pickup,
          total_dam_truck: damTruck,
          estimasi: hitungEstimasi(pickup, damTruck),
          cluster_count: clusterIds.size,
          spk_count: (spkByBatch[b.id] ?? []).length,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteReadyBatch(deleteId);
      await logActivity('Menghapus batch READY_FOR_QS');
      toast.success('Batch dihapus');
      setDeleteId(null);
      affectedWorkflowQueries.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      load();
    } catch (error) {
      toast.error('Gagal menghapus batch', { description: getWorkflowErrorMessage(error) });
    }
  }

  async function handleSendToQs(batch: BatchRow) {
    try {
      await sendBatchToQs(batch.id);
      await logActivity(`Mengirim batch "${batch.nama_batch}" ke QS`);
      toast.success('Batch dikirim ke QS');
      affectedWorkflowQueries.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      load();
    } catch (error) {
      toast.error('Gagal mengirim batch ke QS', { description: getWorkflowErrorMessage(error) });
    }
  }

  function handleExport(format: 'excel' | 'pdf' | 'print') {
    const columns: ExportColumn<BatchRow>[] = [
      { header: 'Nama Batch', accessor: (r) => r.nama_batch },
      { header: 'Tanggal Diterima', accessor: (r) => formatDate(r.tanggal_diterima) },
      { header: 'Cakupan Tanggal Surat Jalan', accessor: (r) => `${formatDate(r.periode_awal)} - ${formatDate(r.periode_akhir)}` },
      { header: 'Total SJ', accessor: (r) => r.surat_jalan_count },
      { header: 'Pickup', accessor: (r) => r.total_pickup },
      { header: 'Dump Truck', accessor: (r) => r.total_dam_truck },
      { header: 'Estimasi', accessor: (r) => formatRupiah(r.estimasi) },
      { header: 'Status', accessor: (r) => r.status },
    ];
    if (format === 'excel') exportToExcel(rows, columns, 'daftar-batch');
    else if (format === 'pdf') exportToPDF(rows, columns, 'daftar-batch', 'Daftar Batch');
    else printData(rows, columns, 'Daftar Batch');
  }

  const columns: ColumnDef<BatchRow>[] = [
    {
      accessorKey: 'nama_batch',
      header: 'Batch Name',
      cell: ({ row }) => (
        <Link to={`/batch/${row.original.id}`} className="font-medium text-foreground hover:underline">
          {row.original.nama_batch}
        </Link>
      ),
    },
    {
      id: 'periode',
      header: 'Cakupan Tanggal Surat Jalan',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.periode_awal)} - {formatDate(row.original.periode_akhir)}
        </span>
      ),
    },
    {
      accessorKey: 'tanggal_diterima',
      header: 'Tanggal Diterima',
      cell: ({ row }) => formatDate(row.original.tanggal_diterima),
    },
    {
      accessorKey: 'surat_jalan_count',
      header: 'Total SJ',
      cell: ({ row }) => <span className="font-medium">{row.original.surat_jalan_count}</span>,
    },
    {
      accessorKey: 'total_pickup',
      header: 'Pickup',
      cell: ({ row }) => row.original.total_pickup,
    },
    {
      accessorKey: 'total_dam_truck',
      header: 'Dump Truck',
      cell: ({ row }) => row.original.total_dam_truck,
    },
    {
      accessorKey: 'estimasi',
      header: 'Estimated Cost',
      cell: ({ row }) => <span className="font-medium">{formatRupiah(row.original.estimasi)}</span>,
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
      size: 260,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {isStatus(row.original.status, 'READY_FOR_QS') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendToQs(row.original)}
              className="gap-1"
            >
              <Send className="h-3.5 w-3.5" /> Kirim ke QS
            </Button>
          )}
          {(isStatus(row.original.status, 'IN_QS_REVIEW') || isStatus(row.original.status, 'SPK_ISSUED')) && row.original.spk_count < row.original.cluster_count && (
            <Button
              size="sm"
              onClick={() => navigate(`/batch/${row.original.id}?action=spk`)}
              className="gap-1"
            >
              <FileSignature className="h-3.5 w-3.5" /> Terbit SPK
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" title="Detail">
            <Link to={`/batch/${row.original.id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} title="Hapus">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Pengiriman"
        description="Satu batch mewakili satu kali penyerahan kumpulan Surat Jalan dari Sabilillah untuk dikirim bersama ke QS."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileText className="mr-2 h-4 w-4" /> Excel
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Batch', value: rows.length },
          { label: 'Siap Dikirim', value: rows.filter((r) => isStatus(r.status, 'READY_FOR_QS')).length },
          { label: 'Proses QS', value: rows.filter((r) => isStatus(r.status, 'IN_QS_REVIEW')).length },
          { label: 'Selesai', value: rows.filter((r) => isStatus(r.status, 'COMPLETED')).length },
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
        searchPlaceholder="Cari batch..."
        searchKeys={['nama_batch']}
        emptyComponent={loading ? 'Memuat data...' : 'Belum ada batch.'}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Batch?"
        description="Hanya batch READY_FOR_QS tanpa SPK yang dapat dihapus. Surat Jalan akan dikembalikan ke Draft."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
