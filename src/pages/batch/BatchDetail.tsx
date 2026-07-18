import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, FileSignature, Download, FileText, Printer, X,
} from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type { Batch, SuratJalan, Spk, MasterCluster } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDate, formatRupiah } from '@/lib/format';
import { hitungEstimasi } from '@/lib/constants';
import { sendBatchToQs } from '@/lib/batchService';
import { computeSpkStatus, computeSJProgress } from '@/lib/batchStatus';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';
import { toast } from 'sonner';

interface DetailData {
  batch: Batch | null;
  suratJalan: SuratJalan[];
  spks: Spk[];
  clusters: MasterCluster[];
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSpkForm, setShowSpkForm] = useState(false);
  const [spkClusterId, setSpkClusterId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [b, sj, spks, c] = await Promise.all([
      supabase.from('batch').select('*').eq('id', id).maybeSingle(),
      supabase.from('surat_jalan').select('*').eq('batch_id', id).order('tanggal', { ascending: true }),
      supabase.from('spk').select('*').eq('batch_id', id).order('created_at', { ascending: true }),
      supabase.from('master_cluster').select('*'),
    ]);
    setData({
      batch: (b.data as Batch | null) ?? null,
      suratJalan: (sj.data as SuratJalan[]) ?? [],
      spks: (spks.data as Spk[]) ?? [],
      clusters: (c.data as MasterCluster[]) ?? [],
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('action') === 'spk' && data?.batch?.status === 'Proses QS') {
      setShowSpkForm(true);
    }
  }, [params, data?.batch?.status]);

  const clustersInBatch = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.suratJalan.map((s) => s.cluster_id).filter(Boolean) as string[]);
    return data.clusters.filter((c) => ids.has(c.id));
  }, [data]);

  async function handleSendToQs() {
    if (!data?.batch) return;
    const ok = await sendBatchToQs(data.batch.id);
    if (!ok) return toast.error('Gagal mengirim ke QS');
    await logActivity(`Mengirim batch "${data.batch.nama_batch}" ke QS`);
    toast.success('Batch dikirim ke QS');
    load();
  }

  if (loading) return <TableSkeleton rows={4} cols={4} />;
  if (!data?.batch) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/batch')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Batch tidak ditemukan
          </CardContent>
        </Card>
      </div>
    );
  }

  const batch = data.batch;
  const totalPickup = data.suratJalan.reduce((a, s) => a + (s.pickup ?? 0), 0);
  const totalDamTruck = data.suratJalan.reduce((a, s) => a + (s.dam_truck ?? 0), 0);
  const estimasi = hitungEstimasi(totalPickup, totalDamTruck);
  const sentToQs = !!batch.tanggal_kirim_qs;

  function handleExport(format: 'excel' | 'pdf' | 'print') {
    if (!data) return;
    const columns: ExportColumn<SuratJalan>[] = [
      { header: 'Tanggal', accessor: (r) => formatDate(r.tanggal) },
      { header: 'Nomor Polisi', accessor: (r) => r.nomor_polisi ?? '-' },
      { header: 'Jenis Kendaraan', accessor: (r) => r.jenis_kendaraan ?? '-' },
      { header: 'Pickup', accessor: (r) => r.pickup },
      { header: 'Dump Truck', accessor: (r) => r.dam_truck },
      { header: 'Total', accessor: (r) => formatRupiah(r.total) },
    ];
    const filename = `batch-${batch.nama_batch}`;
    if (format === 'excel') exportToExcel(data.suratJalan, columns, filename);
    else if (format === 'pdf') exportToPDF(data.suratJalan, columns, filename, 'Daftar Surat Jalan');
    else printData(data.suratJalan, columns, 'Daftar Surat Jalan');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.nama_batch}
        description={`Periode: ${formatDate(batch.periode_awal)} - ${formatDate(batch.periode_akhir)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/batch')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            {batch.status === 'Belum Dikirim' && (
              <Button onClick={handleSendToQs}>
                <Send className="mr-2 h-4 w-4" /> Kirim ke QS
              </Button>
            )}
            {batch.status === 'Proses QS' && (
              <Button onClick={() => setShowSpkForm(true)}>
                <FileSignature className="mr-2 h-4 w-4" /> Terbit SPK
              </Button>
            )}
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('print')}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total SJ', value: data.suratJalan.length },
          { label: 'Total Pickup', value: totalPickup },
          { label: 'Total Dump Truck', value: totalDamTruck },
          { label: 'Estimasi Biaya', value: formatRupiah(estimasi) },
          { label: 'Status', value: batch.status, isStatus: true },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              {s.isStatus ? (
                <div className="mt-1">
                  <StatusBadge status={batch.status} />
                </div>
              ) : (
                <p className="mt-1 text-xl font-semibold">{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {batch.tanggal_kirim_qs && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm">
            <span className="text-muted-foreground">Dikirim ke QS pada: </span>
            <span className="font-semibold">{formatDate(batch.tanggal_kirim_qs)}</span>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-lg font-semibold">Cluster & Surat Jalan</h3>
        {clustersInBatch.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Belum ada cluster pada batch ini
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {clustersInBatch.map((cluster) => {
              const clusterSJs = data.suratJalan.filter((s) => s.cluster_id === cluster.id);
              const clusterSpk = data.spks.find((s) => s.cluster_id === cluster.id) ?? null;
              const spkStatus = computeSpkStatus(clusterSpk);
              return (
                <AccordionItem key={cluster.id} value={cluster.id} className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between gap-4 pr-3">
                      <span className="font-semibold">{cluster.nama_cluster}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={spkStatus} />
                        <span className="text-xs text-muted-foreground">{clusterSJs.length} SJ</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground">Total Pickup</p>
                          <p className="font-semibold">
                            {clusterSJs.reduce((a, s) => a + (s.pickup ?? 0), 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Dump Truck</p>
                          <p className="font-semibold">
                            {clusterSJs.reduce((a, s) => a + (s.dam_truck ?? 0), 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status SPK</p>
                          <p className="font-semibold">{spkStatus}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {clusterSJs.map((sj) => {
                          const progress = computeSJProgress(sj, sentToQs, spkStatus);
                          return (
                            <div
                              key={sj.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium">{formatDate(sj.tanggal)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sj.nomor_polisi ?? '-'} • {sj.jenis_kendaraan ?? '-'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Total</p>
                                  <p className="text-sm font-semibold">{formatRupiah(sj.total)}</p>
                                </div>
                                <StatusBadge status={progress} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {clusterSpk ? (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/spk/${clusterSpk.id}`}>Lihat SPK</Link>
                        </Button>
                      ) : batch.status === 'Proses QS' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSpkClusterId(cluster.id);
                            setShowSpkForm(true);
                          }}
                        >
                          <FileSignature className="mr-2 h-4 w-4" /> Terbit SPK
                        </Button>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <SpkFormDialog
        open={showSpkForm}
        onOpenChange={setShowSpkForm}
        batchId={batch.id}
        clusters={clustersInBatch}
        existingSpks={data.spks}
        presetClusterId={spkClusterId}
        onSaved={() => {
          setShowSpkForm(false);
          setSpkClusterId(null);
          load();
        }}
      />
    </div>
  );
}

interface SpkFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  batchId: string;
  clusters: MasterCluster[];
  existingSpks: Spk[];
  presetClusterId: string | null;
  onSaved: () => void;
}

function SpkFormDialog({
  open, onOpenChange, batchId, clusters, existingSpks, presetClusterId, onSaved,
}: SpkFormDialogProps) {
  const [clusterId, setClusterId] = useState<string>('');
  const [nomorSpk, setNomorSpk] = useState('');
  const [tanggalSpk, setTanggalSpk] = useState(new Date().toISOString().slice(0, 10));
  const [nominalSpk, setNominalSpk] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClusterId(presetClusterId ?? '');
      setNomorSpk('');
      setTanggalSpk(new Date().toISOString().slice(0, 10));
      setNominalSpk('');
      setCatatan('');
    }
  }, [open, presetClusterId]);

  const availableClusters = clusters.filter(
    (c) => !existingSpks.some((s) => s.cluster_id === c.id)
  );

  async function handleSave() {
    if (!clusterId || !nomorSpk || !tanggalSpk) {
      toast.error('Cluster, Nomor SPK, dan Tanggal SPK wajib diisi');
      return;
    }
    setSaving(true);
    const { data: spk, error } = await supabase
      .from('spk')
      .insert({
        batch_id: batchId,
        cluster_id: clusterId,
        nomor_spk: nomorSpk,
        tanggal_spk: tanggalSpk,
        nominal_spk: nominalSpk ? Number(nominalSpk) : null,
        catatan: catatan || null,
        status: 'SPK Terbit',
      })
      .select('id')
      .maybeSingle();

    if (error || !spk) {
      setSaving(false);
      return toast.error('Gagal menerbitkan SPK');
    }

    // Connect related Surat Jalan to this SPK
    await supabase
      .from('surat_jalan')
      .update({ spk_id: spk.id, status: 'SPK Terbit' })
      .eq('batch_id', batchId)
      .eq('cluster_id', clusterId);

    await logActivity(`Menerbitkan SPK ${nomorSpk}`);
    setSaving(false);
    toast.success('SPK berhasil diterbitkan');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Terbit SPK</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cluster</Label>
            <Select value={clusterId} onValueChange={setClusterId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih cluster" />
              </SelectTrigger>
              <SelectContent>
                {availableClusters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama_cluster}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableClusters.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Semua cluster pada batch ini sudah memiliki SPK.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nomor SPK</Label>
              <Input value={nomorSpk} onChange={(e) => setNomorSpk(e.target.value)} placeholder="SPK/2026/07/0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal SPK</Label>
              <Input type="date" value={tanggalSpk} onChange={(e) => setTanggalSpk(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nominal SPK</Label>
            <Input type="number" value={nominalSpk} onChange={(e) => setNominalSpk(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || availableClusters.length === 0}>
            {saving ? 'Menyimpan...' : 'Terbit SPK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
