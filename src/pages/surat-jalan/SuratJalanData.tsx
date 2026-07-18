import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Trash2, FileSpreadsheet, FileText, Printer,
  Layers,
} from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type {
  SuratJalanWithRelations, Batch, MasterCluster, MasterVendor,
} from '@/lib/types';
import { formatRupiah, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';
import { assignSuratJalanToAutoBatch } from '@/lib/batchService';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { getWorkflowErrorMessage, type AssignBatchResult } from '@/lib/workflows';
import { assertValidAssignResult, formatAssignSuccess } from '@/lib/batchAssignment';

type SJRow = SuratJalanWithRelations & {
  batchLabel: string;
};

export default function SuratJalanData() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useAuth();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [filterTanggal, setFilterTanggal] = useState<string>('');
  const [filterBatch, setFilterBatch] = useState<string>('all');

  const { data: rows = [], isLoading } = useQuery<SuratJalanWithRelations[]>({
    queryKey: ['surat_jalan'],
    queryFn: async () => {
      const { data } = await supabase
        .from('surat_jalan')
        .select(
          '*, vendor:master_vendor(*), cluster:master_cluster(*), kontraktor:master_kontraktor(*), batch:batch(*)'
        )
        .order('tanggal', { ascending: false });
      return (data as unknown as SuratJalanWithRelations[]) ?? [];
    },
  });

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ['batch'],
    queryFn: async () => {
      const { data } = await supabase.from('batch').select('*');
      return (data as Batch[]) ?? [];
    },
  });

  const { data: clusters = [] } = useQuery<MasterCluster[]>({
    queryKey: ['master_cluster'],
    queryFn: async () => {
      const { data } = await supabase.from('master_cluster').select('*');
      return (data as MasterCluster[]) ?? [];
    },
  });

  const { data: vendors = [] } = useQuery<MasterVendor[]>({
    queryKey: ['master_vendor'],
    queryFn: async () => {
      const { data } = await supabase.from('master_vendor').select('*');
      return (data as MasterVendor[]) ?? [];
    },
  });

  const enriched: SJRow[] = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      batchLabel: r.batch?.nama_batch ?? 'Belum Masuk Batch',
    }));
  }, [rows]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (filterCluster !== 'all' && r.cluster_id !== filterCluster) return false;
      if (filterVendor !== 'all' && r.vendor_id !== filterVendor) return false;
      if (filterTanggal && r.tanggal !== filterTanggal) return false;
      if (filterBatch === 'unassigned' && r.batch_id) return false;
      if (filterBatch !== 'all' && filterBatch !== 'unassigned' && r.batch_id !== filterBatch)
        return false;
      return true;
    });
  }, [enriched, filterCluster, filterVendor, filterTanggal, filterBatch]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const selectedTotal = useMemo(
    () =>
      rows
        .filter((r) => selectedIds.includes(r.id))
        .reduce((acc, r) => acc + Number(r.total ?? 0), 0),
    [rows, selectedIds]
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surat_jalan').delete().eq('id', id);
      if (error) throw error;
      await logActivity('Menghapus surat jalan');
    },
    onSuccess: () => {
      toast.success('Surat jalan dihapus');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['surat_jalan'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
    },
    onError: (err) => toast.error('Gagal menghapus: ' + err.message),
  });

  const assignBatchMutation = useMutation<AssignBatchResult, Error, string[]>({
    mutationFn: async (ids: string[]) => {
      const result = await assignSuratJalanToAutoBatch(ids);
      assertValidAssignResult(result, ids.length);
      await logActivity(`Menempatkan ${result.assigned_count} surat jalan ke batch otomatis`);
      return result;
    },
    onSuccess: (result) => {
      toast.success(`${result.assigned_count} Surat Jalan berhasil dimasukkan`, {
        description: formatAssignSuccess(result),
      });
      setSelected({});
      queryClient.invalidateQueries({ queryKey: ['surat_jalan'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
    },
    onError: (err) => toast.error('Gagal memasukkan ke batch', { description: getWorkflowErrorMessage(err) }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('surat_jalan').delete().in('id', ids);
      if (error) throw error;
      await logActivity(`Menghapus ${ids.length} surat jalan`);
    },
    onSuccess: () => {
      toast.success('Surat jalan dihapus');
      setSelected({});
      queryClient.invalidateQueries({ queryKey: ['surat_jalan'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
    },
    onError: (err) => toast.error('Gagal menghapus: ' + err.message),
  });

  const exportColumns: ExportColumn<SJRow>[] = [
    { header: 'Tanggal', accessor: (r) => formatDate(r.tanggal) },
    { header: 'Nomor Polisi', accessor: (r) => r.nomor_polisi ?? '-' },
    { header: 'Vendor', accessor: (r) => r.vendor?.nama_vendor ?? '-' },
    { header: 'Cluster', accessor: (r) => r.cluster?.nama_cluster ?? '-' },
    { header: 'Kontraktor', accessor: (r) => r.kontraktor?.nama_kontraktor ?? '-' },
    { header: 'Jenis Kendaraan', accessor: (r) => r.jenis_kendaraan ?? '-' },
    { header: 'Harga', accessor: (r) => formatRupiah(r.harga) },
    { header: 'Batch', accessor: (r) => r.batchLabel },
  ];

  const columns: ColumnDef<SJRow>[] = [
    {
      id: 'select',
      header: () => {
        const visibleIds = filtered.filter((r) => !r.batch_id).map((r) => r.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
        return (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => {
              const next = { ...selected };
              visibleIds.forEach((id) => {
                if (v) next[id] = true;
                else delete next[id];
              });
              setSelected(next);
            }}
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={!!selected[row.original.id]}
          disabled={!canWrite || !!row.original.batch_id}
          onCheckedChange={(v) =>
            setSelected((prev) => {
              const next = { ...prev };
              if (v && !row.original.batch_id) next[row.original.id] = true;
              else delete next[row.original.id];
              return next;
            })
          }
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'tanggal',
      header: 'Tanggal',
      cell: ({ row }) => formatDate(row.original.tanggal),
    },
    {
      accessorKey: 'nomor_polisi',
      header: 'Nomor Polisi',
      cell: ({ row }) => row.original.nomor_polisi ?? '-',
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.original.vendor?.nama_vendor ?? '-',
    },
    {
      accessorKey: 'cluster',
      header: 'Cluster',
      cell: ({ row }) => row.original.cluster?.nama_cluster ?? '-',
    },
    {
      accessorKey: 'kontraktor',
      header: 'Kontraktor',
      cell: ({ row }) => row.original.kontraktor?.nama_kontraktor ?? '-',
    },
    {
      accessorKey: 'jenis_kendaraan',
      header: 'Jenis Kendaraan',
      cell: ({ row }) => row.original.jenis_kendaraan ?? '-',
    },
    {
      accessorKey: 'harga',
      header: 'Harga',
      cell: ({ row }) => <span className="font-medium">{formatRupiah(row.original.harga)}</span>,
    },
    {
      id: 'batch',
      header: 'Batch',
      cell: ({ row }) =>
        row.original.batch_id ? (
          <Link
            to={`/batch/${row.original.batch_id}`}
            className="text-primary hover:underline"
          >
            {row.original.batch?.nama_batch}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Belum Masuk Batch</span>
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/surat-jalan/input?id=${row.original.id}`)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            title="Hapus"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <TableSkeleton rows={6} cols={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Surat Jalan"
        description="Kelola seluruh data surat jalan dari vendor."
        actions={
          <Button asChild>
            <Link to="/surat-jalan/input">
              <Plus className="mr-2 h-4 w-4" /> Input Surat Jalan
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Cluster</Label>
          <Select value={filterCluster} onValueChange={setFilterCluster}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cluster</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama_cluster}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vendor</Label>
          <Select value={filterVendor} onValueChange={setFilterVendor}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Vendor</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nama_vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tanggal</Label>
          <Input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Batch</Label>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Batch</SelectItem>
              <SelectItem value="unassigned">Belum Masuk Batch</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nama_batch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportToExcel(filtered, exportColumns, 'surat-jalan', 'Surat Jalan')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportToPDF(filtered, exportColumns, 'surat-jalan', 'Daftar Surat Jalan')}
              >
                <FileText className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => printData(filtered, exportColumns, 'Daftar Surat Jalan')}
              >
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {selectedIds.length} Surat Jalan dipilih
                </p>
                <p className="text-xs text-muted-foreground">Total nilai: {formatRupiah(selectedTotal)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setSelected({})}>
                Batal Pilih
              </Button>
              {canWrite && (
                <Button
                  onClick={() => assignBatchMutation.mutate(selectedIds)}
                  disabled={assignBatchMutation.isPending}
                >
                  <Layers className="mr-2 h-4 w-4" /> {assignBatchMutation.isPending ? 'Assign...' : 'Assign ke Batch'}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Cari nomor polisi..."
        searchKeys={['nomor_polisi']}
        emptyComponent="Belum ada surat jalan."
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Surat Jalan?"
        description="Surat jalan akan dihapus permanen."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
