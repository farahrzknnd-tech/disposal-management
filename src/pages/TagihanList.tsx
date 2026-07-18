import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ScrollText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type { SpkWithRelations } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRupiah, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function TagihanListPage() {
  const [rows, setRows] = useState<SpkWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('spk')
      .select('*, cluster:master_cluster(*), batch:batch(*)')
      .neq('status', 'Draft')
      .order('created_at', { ascending: false });
    setRows((data as unknown as SpkWithRelations[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalTagihan = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.nominal_tagihan ?? 0), 0),
    [rows]
  );
  const totalPaid = useMemo(
    () =>
      rows.filter((r) => r.status === 'Selesai').reduce((acc, r) => acc + Number(r.nominal_tagihan ?? 0), 0),
    [rows]
  );

  async function markSelesai(id: string, batchId: string) {
    const { error } = await supabase.from('spk').update({ status: 'Selesai' }).eq('id', id);
    if (error) return toast.error('Gagal menandai selesai');
    const { data: allSpk } = await supabase.from('spk').select('status').eq('batch_id', batchId);
    const allDone = (allSpk ?? []).every((s: any) => s.status === 'Selesai');
    if (allDone) {
      await supabase.from('batch').update({ status: 'Selesai' }).eq('id', batchId);
      await supabase.from('surat_jalan').update({ status: 'Selesai' }).eq('batch_id', batchId);
    }
    await logActivity('Menandai SPK selesai');
    toast.success('SPK ditandai selesai');
    load();
  }

  const columns: ColumnDef<SpkWithRelations>[] = [
    {
      accessorKey: 'nomor_tagihan',
      header: 'Nomor Tagihan',
      cell: ({ row }) => (
        <Link to={`/spk/${row.original.id}`} className="font-medium text-foreground hover:underline">
          {row.original.nomor_tagihan ?? '-'}
        </Link>
      ),
    },
    {
      accessorKey: 'batch',
      header: 'Batch',
      cell: ({ row }) => row.original.batch?.nama_batch ?? '-',
    },
    {
      accessorKey: 'cluster',
      header: 'Cluster',
      cell: ({ row }) => row.original.cluster?.nama_cluster ?? '-',
    },
    {
      accessorKey: 'nomor_spk',
      header: 'Nomor SPK',
      cell: ({ row }) => row.original.nomor_spk ?? '-',
    },
    {
      accessorKey: 'tanggal_tagihan',
      header: 'Tgl Tagihan',
      cell: ({ row }) => formatDate(row.original.tanggal_tagihan),
    },
    {
      accessorKey: 'nominal_tagihan',
      header: 'Nominal Tagihan',
      cell: ({ row }) => <span className="font-medium">{formatRupiah(row.original.nominal_tagihan)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'Tagihan Diserahkan' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markSelesai(row.original.id, row.original.batch_id)}
              className="gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
            </Button>
          )}
          <Button asChild variant="ghost" size="icon">
            <Link to={`/spk/${row.original.id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagihan"
        description="Daftar tagihan yang telah diserahkan. Tandai selesai setelah pembayaran diterima."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScrollText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tagihan</p>
                <p className="text-xl font-semibold">{rows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Nilai Tagihan</p>
            <p className="mt-1 text-xl font-semibold">{formatRupiah(totalTagihan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Nilai Selesai</p>
            <p className="mt-1 text-xl font-semibold">{formatRupiah(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Cari tagihan..."
        searchKeys={['nomor_tagihan', 'nomor_spk']}
        emptyComponent={loading ? 'Memuat data...' : 'Belum ada tagihan.'}
      />
    </div>
  );
}
