import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatDate } from '@/lib/format';
import { hitungEstimasi } from '@/lib/constants';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Package, Truck, DollarSign, TrendingDown } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'sj' | 'batch' | 'spk' | 'tagihan' | 'selesai';
}

interface SPKHistory {
  id: string;
  nomor_spk: string;
  tanggal_spk: string;
  batch_name: string;
  nominal_spk: number;
  status: string;
}

interface SJHistory {
  id: string;
  tanggal: string;
  nama_vendor: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  total: number;
}

export default function RekapClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cluster, isLoading: clusterLoading } = useQuery({
    queryKey: ['cluster', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('master_cluster')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: suratJalanList } = useQuery({
    queryKey: ['surat_jalan_cluster', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('surat_jalan')
        .select('*, vendor:master_vendor(*)')
        .eq('cluster_id', id);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: spkList } = useQuery({
    queryKey: ['spk_cluster', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('spk')
        .select('*')
        .eq('cluster_id', id);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: batchList } = useQuery({
    queryKey: ['batch_all'],
    queryFn: async () => {
      const { data } = await supabase.from('batch').select('*');
      return data || [];
    },
  });

  const summary = useMemo(() => {
    if (!suratJalanList || !batchList || !spkList) {
      return {
        namaCluster: cluster?.nama_cluster || '',
        jumlahBatch: 0,
        jumlahSpk: 0,
        jumlahSj: 0,
        pickup: 0,
        damTruck: 0,
        estimasi: 0,
        nominalSpk: 0,
        nominalTagihan: 0,
        selisih: 0,
      };
    }

    // Count batches that have SJ for this cluster
    const batchesWithSJ = new Set<string>();
    suratJalanList.forEach((sj: any) => {
      if (sj.batch_id) {
        batchesWithSJ.add(sj.batch_id);
      }
    });

    const pickup = suratJalanList.filter((sj: any) => sj.jenis_kendaraan === 'Pickup').length;
    const damTruck = suratJalanList.filter((sj: any) => sj.jenis_kendaraan === 'Dam Truck').length;

    // Calculate estimasi from pickup and dam truck counts
    const estimasi = hitungEstimasi(pickup, damTruck);

    const nominalSpk = spkList.reduce((sum: number, spk: any) => sum + (spk.nominal_spk || 0), 0);
    const nominalTagihan = spkList.reduce((sum: number, spk: any) => sum + (spk.nominal_tagihan || 0), 0);

    return {
      namaCluster: cluster?.nama_cluster || '',
      jumlahBatch: batchesWithSJ.size,
      jumlahSpk: spkList.length,
      jumlahSj: suratJalanList.length,
      pickup,
      damTruck,
      estimasi,
      nominalSpk,
      nominalTagihan,
      selisih: estimasi - nominalSpk,
    };
  }, [cluster, suratJalanList, batchList, spkList]);

  const timeline = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add events from surat jalan
    if (suratJalanList && suratJalanList.length > 0) {
      suratJalanList.forEach((sj: any) => {
        events.push({
          id: `sj-${sj.id}`,
          timestamp: sj.tanggal,
          title: 'Surat Jalan Dibuat',
          description: `SJ ${sj.nomor_polisi} - ${sj.jenis_kendaraan}`,
          type: 'sj',
        });
      });
    }

    // Add events from SPK
    if (spkList && spkList.length > 0) {
      spkList.forEach((spk: any) => {
        if (spk.tanggal_spk) {
          events.push({
            id: `spk-${spk.id}`,
            timestamp: spk.tanggal_spk,
            title: 'SPK Digenerate',
            description: `SPK ${spk.nomor_spk} dibuat`,
            type: 'spk',
          });
        }
        if (spk.tanggal_tagihan) {
          events.push({
            id: `tagihan-${spk.id}`,
            timestamp: spk.tanggal_tagihan,
            title: 'Tagihan Diserahkan',
            description: `Tagihan untuk SPK ${spk.nomor_spk} diserahkan`,
            type: 'tagihan',
          });
        }
      });
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [suratJalanList, spkList]);

  const spkHistory: SPKHistory[] = useMemo(() => {
    if (!spkList || !batchList) return [];

    return spkList.map((spk: any) => {
      const batch = batchList.find((b: any) => b.id === spk.batch_id);
      return {
        id: spk.id,
        nomor_spk: spk.nomor_spk,
        tanggal_spk: spk.tanggal_spk,
        batch_name: batch?.nama_batch || '',
        nominal_spk: spk.nominal_spk || 0,
        status: spk.status || 'Draft',
      };
    });
  }, [spkList, batchList]);

  const sjHistory: SJHistory[] = useMemo(() => {
    if (!suratJalanList) return [];

    return suratJalanList.map((sj: any) => ({
      id: sj.id,
      tanggal: sj.tanggal,
      nama_vendor: sj.vendor?.nama_vendor || 'Unknown',
      nomor_polisi: sj.nomor_polisi || '',
      jenis_kendaraan: sj.jenis_kendaraan || '',
      total: sj.total || 0,
    }));
  }, [suratJalanList]);

  if (clusterLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/rekap-cluster')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <PageHeader
          title={`Detail Cluster: ${summary.namaCluster}`}
          description="Informasi lengkap cluster dan status pengiriman"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.jumlahBatch}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jumlah SPK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.jumlahSpk}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Surat Jalan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.jumlahSj}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pickup / Dam Truck</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.pickup} / {summary.damTruck}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(summary.estimasi)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nominal SPK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(summary.nominalSpk)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nominal Tagihan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(summary.nominalTagihan)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selisih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.selisih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatRupiah(summary.selisih)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <p className="text-muted-foreground">Belum ada aktivitas</p>
            ) : (
              timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                      {event.type === 'sj' && <Package className="h-5 w-5 text-yellow-600" />}
                      {event.type === 'batch' && <Truck className="h-5 w-5 text-yellow-600" />}
                      {event.type === 'spk' && <DollarSign className="h-5 w-5 text-yellow-600" />}
                      {event.type === 'tagihan' && <TrendingDown className="h-5 w-5 text-yellow-600" />}
                      {event.type === 'selesai' && <Calendar className="h-5 w-5 text-yellow-600" />}
                    </div>
                    {index < timeline.length - 1 && <div className="mt-2 h-8 w-0.5 bg-muted" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History SPK</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Nomor SPK</th>
                  <th className="text-left py-3 px-4 font-medium">Tanggal SPK</th>
                  <th className="text-left py-3 px-4 font-medium">Batch</th>
                  <th className="text-left py-3 px-4 font-medium">Nominal SPK</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {spkHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">
                      Belum ada SPK
                    </td>
                  </tr>
                ) : (
                  spkHistory.map((spk) => (
                    <tr key={spk.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{spk.nomor_spk}</td>
                      <td className="py-3 px-4">{formatDate(spk.tanggal_spk)}</td>
                      <td className="py-3 px-4">{spk.batch_name}</td>
                      <td className="py-3 px-4">{formatRupiah(spk.nominal_spk)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={spk.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History Surat Jalan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                  <th className="text-left py-3 px-4 font-medium">Vendor</th>
                  <th className="text-left py-3 px-4 font-medium">Nomor Polisi</th>
                  <th className="text-left py-3 px-4 font-medium">Jenis Kendaraan</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sjHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">
                      Belum ada surat jalan
                    </td>
                  </tr>
                ) : (
                  sjHistory.map((sj) => (
                    <tr key={sj.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{formatDate(sj.tanggal)}</td>
                      <td className="py-3 px-4">{sj.nama_vendor}</td>
                      <td className="py-3 px-4">{sj.nomor_polisi}</td>
                      <td className="py-3 px-4">{sj.jenis_kendaraan}</td>
                      <td className="py-3 px-4">{formatRupiah(sj.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
