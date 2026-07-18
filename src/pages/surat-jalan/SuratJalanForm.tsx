import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase, logActivity } from '@/lib/supabase';
import type { MasterCluster, MasterKontraktor, MasterVendor } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/lib/format';
import { JENIS_KENDARAAN_OPTIONS, PICKUP_PRICE, DAM_TRUCK_PRICE } from '@/lib/constants';
import { toast } from 'sonner';

const schema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  vendor_id: z.string().min(1, 'Vendor wajib dipilih'),
  cluster_id: z.string().min(1, 'Cluster wajib dipilih'),
  kontraktor_id: z.string().optional(),
  jenis_kendaraan: z.enum(['Pickup', 'Dump Truck']),
  nomor_polisi: z.string().optional(),
  warna: z.string().optional(),
  jam_keluar: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SuratJalanForm() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? undefined;
  const navigate = useNavigate();
  const isEdit = !!id;
  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [clusters, setClusters] = useState<MasterCluster[]>([]);
  const [kontraktors, setKontraktors] = useState<MasterKontraktor[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal: new Date().toISOString().slice(0, 10),
      vendor_id: '',
      cluster_id: '',
      kontraktor_id: '',
      jenis_kendaraan: 'Dump Truck',
      nomor_polisi: '',
      warna: '',
      jam_keluar: '',
    },
  });

  const jenisKendaraan = form.watch('jenis_kendaraan');
  const isPickup = jenisKendaraan === 'Pickup';
  const pickup = isPickup ? 1 : 0;
  const damTruck = isPickup ? 0 : 1;
  const harga = isPickup ? PICKUP_PRICE : DAM_TRUCK_PRICE;
  const total = harga;

  useEffect(() => {
    (async () => {
      const [v, c, k] = await Promise.all([
        supabase.from('master_vendor').select('*').eq('status', 'Aktif'),
        supabase.from('master_cluster').select('*').eq('status', 'Aktif'),
        supabase.from('master_kontraktor').select('*').eq('status', 'Aktif'),
      ]);
      setVendors(v.data ?? []);
      setClusters(c.data ?? []);
      setKontraktors(k.data ?? []);

      if (id) {
        const { data, error } = await supabase
          .from('surat_jalan')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error || !data) {
          toast.error('Surat jalan tidak ditemukan');
          navigate('/surat-jalan');
          return;
        }
        const jk = (data.jenis_kendaraan === 'Pickup' ? 'Pickup' : 'Dump Truck') as
          | 'Pickup'
          | 'Dump Truck';
        form.reset({
          tanggal: data.tanggal,
          vendor_id: data.vendor_id ?? '',
          cluster_id: data.cluster_id ?? '',
          kontraktor_id: data.kontraktor_id ?? '',
          jenis_kendaraan: jk,
          nomor_polisi: data.nomor_polisi ?? '',
          warna: data.warna ?? '',
          jam_keluar: data.jam_keluar ?? '',
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const isPick = values.jenis_kendaraan === 'Pickup';
    const payload = {
      tanggal: values.tanggal,
      vendor_id: values.vendor_id || null,
      cluster_id: values.cluster_id || null,
      kontraktor_id: values.kontraktor_id || null,
      jenis_kendaraan: values.jenis_kendaraan,
      pickup: isPick ? 1 : 0,
      dam_truck: isPick ? 0 : 1,
      nomor_polisi: values.nomor_polisi || null,
      warna: values.warna || null,
      jam_keluar: values.jam_keluar || null,
      harga: isPick ? PICKUP_PRICE : DAM_TRUCK_PRICE,
    };
    if (isEdit) {
      // Edit only updates SJ data; never touch batch_id / spk_id
      const { error } = await supabase
        .from('surat_jalan')
        .update(payload)
        .eq('id', id);
      setSaving(false);
      if (error) return toast.error('Gagal memperbarui surat jalan');
      await logActivity('Memperbarui surat jalan');
      toast.success('Surat jalan diperbarui');
    } else {
      const { error } = await supabase.from('surat_jalan').insert(payload);
      setSaving(false);
      if (error) return toast.error('Gagal menambah surat jalan');
      await logActivity('Menambah surat jalan baru');
      toast.success('Surat jalan ditambahkan');
    }
    navigate('/surat-jalan');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Surat Jalan' : 'Input Surat Jalan'}
        description="Pilih jenis kendaraan. Harga dan total dihitung otomatis (1 trip per SJ)."
        actions={
          <Button variant="outline" onClick={() => navigate('/surat-jalan')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        }
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" {...form.register('tanggal')} />
              {form.formState.errors.tanggal && (
                <p className="text-xs text-destructive">{form.formState.errors.tanggal.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select value={form.watch('vendor_id')} onValueChange={(v) => form.setValue('vendor_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nama_vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.vendor_id && (
                <p className="text-xs text-destructive">{form.formState.errors.vendor_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Cluster</Label>
              <Select value={form.watch('cluster_id')} onValueChange={(v) => form.setValue('cluster_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nama_cluster}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.cluster_id && (
                <p className="text-xs text-destructive">{form.formState.errors.cluster_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Kontraktor</Label>
              <Select
                value={form.watch('kontraktor_id') ?? ''}
                onValueChange={(v) => form.setValue('kontraktor_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kontraktor (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {kontraktors.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.nama_kontraktor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Kendaraan</Label>
              <Select
                value={form.watch('jenis_kendaraan')}
                onValueChange={(v) => form.setValue('jenis_kendaraan', v as 'Pickup' | 'Dump Truck')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_KENDARAAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jam Keluar</Label>
              <Input type="time" {...form.register('jam_keluar')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Polisi</Label>
              <Input {...form.register('nomor_polisi')} placeholder="Contoh: B 1234 ABC" />
            </div>
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <Input {...form.register('warna')} placeholder="Contoh: Kuning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Pickup (otomatis)</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold">
                {pickup}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dump Truck (otomatis)</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold">
                {damTruck}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Harga (otomatis)</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold">
                {formatRupiah(harga)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Total (otomatis)</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-primary/10 px-3 text-sm font-semibold text-primary">
                {formatRupiah(total)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/surat-jalan')}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
