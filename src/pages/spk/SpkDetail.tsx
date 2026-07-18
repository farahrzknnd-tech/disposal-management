import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Printer, FileSpreadsheet, CheckCircle2,
} from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type { Spk, Batch, MasterCluster, SuratJalan } from '@/lib/types';
import { computeSpkStatus } from '@/lib/batchStatus';
import { formatRupiah, formatDate, formatDateTime } from '@/lib/format';
import { hitungEstimasi } from '@/lib/constants';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';
import { toast } from 'sonner';
import { completeSpkWorkflow, getWorkflowErrorMessage, submitSpkInvoice } from '@/lib/workflows';
import { isStatus } from '@/lib/status';
import { affectedWorkflowQueries } from '@/lib/queryKeys';

interface DetailData {
  spk: Spk | null;
  batch: Batch | null;
  cluster: MasterCluster | null;
  suratJalan: SuratJalan[];
}

export default function SpkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const [nomorTagihan, setNomorTagihan] = useState('');
  const [tanggalTagihan, setTanggalTagihan] = useState('');
  const [nominalTagihan, setNominalTagihan] = useState('');
  const [catatanTagihan, setCatatanTagihan] = useState('');
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: spk } = await supabase.from('spk').select('*').eq('id', id).maybeSingle();
    const spkData = spk as Spk | null;
    let batch: Batch | null = null;
    let cluster: MasterCluster | null = null;
    let suratJalan: SuratJalan[] = [];
    if (spkData) {
      const [b, c, sj] = await Promise.all([
        supabase.from('batch').select('*').eq('id', spkData.batch_id).maybeSingle(),
        supabase.from('master_cluster').select('*').eq('id', spkData.cluster_id).maybeSingle(),
        supabase
          .from('surat_jalan')
          .select('*, vendor:master_vendor(*), kontraktor:master_kontraktor(*)')
          .eq('batch_id', spkData.batch_id)
          .eq('cluster_id', spkData.cluster_id)
          .order('tanggal', { ascending: true }),
      ]);
      batch = (b.data as Batch | null) ?? null;
      cluster = (c.data as MasterCluster | null) ?? null;
      suratJalan = (sj.data as unknown as SuratJalan[]) ?? [];
    }
    setData({ spk: spkData, batch, cluster, suratJalan });
    setNomorTagihan(spkData?.nomor_tagihan ?? '');
    setTanggalTagihan(spkData?.tanggal_tagihan ?? '');
    setNominalTagihan(spkData?.nominal_tagihan ? String(spkData.nominal_tagihan) : '');
    setCatatanTagihan(spkData?.catatan ?? '');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <TableSkeleton rows={4} cols={4} />;
  if (!data?.spk) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/spk')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            SPK tidak ditemukan
          </CardContent>
        </Card>
      </div>
    );
  }

  const { spk, batch, cluster, suratJalan } = data;
  const status = computeSpkStatus(spk);
  const totalPickup = suratJalan.reduce((a, s) => a + (s.pickup ?? 0), 0);
  const totalDamTruck = suratJalan.reduce((a, s) => a + (s.dam_truck ?? 0), 0);
  const estimasi = hitungEstimasi(totalPickup, totalDamTruck);

  async function handleSaveTagihan() {
    if (!data?.spk || !id) return;
    if (!nomorTagihan || !tanggalTagihan) {
      toast.error('Nomor Tagihan dan Tanggal Tagihan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await submitSpkInvoice({
        spkId: id,
        nomorTagihan,
        tanggalTagihan,
        nominalTagihan: nominalTagihan ? Number(nominalTagihan) : 0,
        catatan: catatanTagihan || null,
      });
      await logActivity(`Menyimpan tagihan ${nomorTagihan} untuk SPK ${data.spk?.nomor_spk}`);
      toast.success('Tagihan disimpan. Status SPK: Ditagihkan');
      affectedWorkflowQueries.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      load();
    } catch (error) {
      toast.error('Gagal menyimpan tagihan', { description: getWorkflowErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkSelesai() {
    if (!data?.spk || !id) return;
    setMarking(true);
    try {
      await completeSpkWorkflow({ spkId: id });
      await logActivity(`SPK ${data.spk.nomor_spk} ditandai selesai`);
      toast.success('SPK ditandai selesai');
      affectedWorkflowQueries.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      load();
    } catch (error) {
      toast.error('Gagal menandai selesai', { description: getWorkflowErrorMessage(error) });
    } finally {
      setMarking(false);
    }
  }

  function handleExport(format: 'excel' | 'pdf' | 'print') {
    if (!data) return;
    const cols: ExportColumn<SuratJalan>[] = [
      { header: 'Tanggal', accessor: (r) => formatDate(r.tanggal) },
      { header: 'Nomor Polisi', accessor: (r) => r.nomor_polisi ?? '-' },
      { header: 'Vendor', accessor: (r) => (r as any).vendor?.nama_vendor ?? '-' },
      { header: 'Jenis', accessor: (r) => r.jenis_kendaraan ?? '-' },
      { header: 'Pickup', accessor: (r) => r.pickup },
      { header: 'Dump Truck', accessor: (r) => r.dam_truck },
      { header: 'Total', accessor: (r) => formatRupiah(r.total) },
    ];
    const fname = `SPK-${spk?.nomor_spk ?? 'draft'}`;
    if (format === 'excel') exportToExcel(suratJalan, cols, fname);
    else if (format === 'pdf') exportToPDF(suratJalan, cols, fname, 'Detail SPK');
    else printData(suratJalan, cols, 'Detail SPK');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`SPK: ${spk.nomor_spk ?? 'Draft'}`}
        description={`Batch: ${batch?.nama_batch ?? '-'} • Cluster: ${cluster?.nama_cluster ?? '-'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/spk')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('print')}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1"><StatusBadge status={status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Jumlah SJ</p>
            <p className="mt-1 text-2xl font-semibold">{suratJalan.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pickup / Dump Truck</p>
            <p className="mt-1 text-2xl font-semibold">{totalPickup} / {totalDamTruck}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Nominal SPK</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{formatRupiah(spk.nominal_spk)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi SPK</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Nomor SPK</p>
            <p className="font-semibold">{spk.nomor_spk ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tanggal SPK</p>
            <p className="font-semibold">{formatDate(spk.tanggal_spk)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nominal SPK</p>
            <p className="font-semibold">{formatRupiah(spk.nominal_spk)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Estimasi Biaya</p>
            <p className="font-semibold">{formatRupiah(estimasi)}</p>
          </div>
          {spk.catatan && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Catatan SPK</p>
              <p className="font-medium">{spk.catatan}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Surat Jalan</CardTitle>
        </CardHeader>
        <CardContent>
          {suratJalan.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada surat jalan pada cluster ini.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tanggal</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nomor Polisi</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Vendor</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Jenis</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {suratJalan.map((sj) => (
                    <tr key={sj.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(sj.tanggal)}</td>
                      <td className="px-4 py-3">{sj.nomor_polisi ?? '-'}</td>
                      <td className="px-4 py-3">{(sj as any).vendor?.nama_vendor ?? '-'}</td>
                      <td className="px-4 py-3">{sj.jenis_kendaraan ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatRupiah(sj.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice (Tagihan)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nomor Tagihan</Label>
              <Input value={nomorTagihan} onChange={(e) => setNomorTagihan(e.target.value)} placeholder="INV/2026/07/0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Tagihan</Label>
              <Input type="date" value={tanggalTagihan} onChange={(e) => setTanggalTagihan(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nominal Tagihan</Label>
              <Input type="number" value={nominalTagihan} onChange={(e) => setNominalTagihan(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={catatanTagihan} onChange={(e) => setCatatanTagihan(e.target.value)} placeholder="Catatan tagihan..." />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveTagihan} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Tagihan'}
            </Button>
            {isStatus(status, 'INVOICED') && (
              <Button variant="outline" onClick={handleMarkSelesai} disabled={marking}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Tandai Selesai
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {spk.updated_at && (
        <div className="text-right text-xs text-muted-foreground">
          Terakhir diperbarui: {formatDateTime(spk.updated_at)}
        </div>
      )}
    </div>
  );
}
