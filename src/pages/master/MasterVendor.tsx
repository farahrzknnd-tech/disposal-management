import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { supabase, logActivity } from '@/lib/supabase';
import type { MasterVendor as MasterVendorType, StatusMaster } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/TableSkeleton';

const formSchema = z.object({
  nama_vendor: z.string().min(1, 'Nama vendor harus diisi'),
  status: z.enum(['Aktif', 'Nonaktif']),
});

type FormValues = z.infer<typeof formSchema>;

export default function MasterVendor() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_vendor: '',
      status: 'Aktif',
    },
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['master_vendor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_vendor')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as MasterVendorType[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('master_vendor')
        .insert([values])
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_vendor'] });
      logActivity(`Tambah vendor ${data?.nama_vendor ?? ''}`);
      toast.success('Vendor berhasil ditambahkan');
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal menambahkan vendor: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!editingId) throw new Error('ID tidak ditemukan');
      const { data, error } = await supabase
        .from('master_vendor')
        .update(values)
        .eq('id', editingId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_vendor'] });
      logActivity(`Update vendor ${data?.nama_vendor ?? ''}`);
      toast.success('Vendor berhasil diperbarui');
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal memperbarui vendor: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('master_vendor').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_vendor'] });
      logActivity('Hapus vendor');
      toast.success('Vendor berhasil dihapus');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error('Gagal menghapus vendor: ' + error.message);
    },
  });

  const handleAdd = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (vendor: MasterVendorType) => {
    setEditingId(vendor.id);
    form.setValue('nama_vendor', vendor.nama_vendor);
    form.setValue('status', vendor.status as StatusMaster);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const exportColumns: ExportColumn<MasterVendorType>[] = [
    { header: 'Nama Vendor', accessor: (r) => r.nama_vendor },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Dibuat', accessor: (r) => formatDate(r.created_at) },
  ];

  const columns: ColumnDef<MasterVendorType>[] = [
    { accessorKey: 'nama_vendor', header: 'Nama Vendor' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Dibuat',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Vendor"
        description="Kelola data vendor"
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Vendor
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => vendors && exportToExcel(vendors, exportColumns, 'master-vendor', 'Vendor')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" onClick={() => vendors && exportToPDF(vendors, exportColumns, 'master-vendor', 'Daftar Vendor')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => vendors && printData(vendors, exportColumns, 'Daftar Vendor')}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable columns={columns} data={vendors || []} searchPlaceholder="Cari vendor..." searchKeys={['nama_vendor']} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vendor' : 'Tambah Vendor'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi vendor' : 'Tambahkan vendor baru ke sistem'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_vendor">Nama Vendor</Label>
              <Input id="nama_vendor" placeholder="Masukkan nama vendor" {...form.register('nama_vendor')} />
              {form.formState.errors.nama_vendor && (
                <p className="text-sm text-destructive">{form.formState.errors.nama_vendor.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as StatusMaster)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Perbarui' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Vendor"
        description="Apakah Anda yakin ingin menghapus vendor ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
