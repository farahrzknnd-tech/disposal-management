import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { supabase, logActivity } from '@/lib/supabase';
import type { MasterKontraktor as MasterKontraktorType, StatusMaster } from '@/lib/types';
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
  nama_kontraktor: z.string().min(1, 'Nama kontraktor harus diisi'),
  alamat: z.string().optional().default(''),
  telepon: z.string().optional().default(''),
  status: z.enum(['Aktif', 'Nonaktif']),
});

type FormValues = z.infer<typeof formSchema>;

export default function MasterKontraktor() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kontraktor: '',
      alamat: '',
      telepon: '',
      status: 'Aktif',
    },
  });

  const { data: kontraktors, isLoading } = useQuery({
    queryKey: ['master_kontraktor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_kontraktor')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as MasterKontraktorType[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('master_kontraktor')
        .insert([values])
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_kontraktor'] });
      logActivity(`Tambah kontraktor ${data?.nama_kontraktor ?? ''}`);
      toast.success('Kontraktor berhasil ditambahkan');
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal menambahkan kontraktor: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!editingId) throw new Error('ID tidak ditemukan');
      const { data, error } = await supabase
        .from('master_kontraktor')
        .update(values)
        .eq('id', editingId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_kontraktor'] });
      logActivity(`Update kontraktor ${data?.nama_kontraktor ?? ''}`);
      toast.success('Kontraktor berhasil diperbarui');
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal memperbarui kontraktor: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('master_kontraktor').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_kontraktor'] });
      logActivity('Hapus kontraktor');
      toast.success('Kontraktor berhasil dihapus');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error('Gagal menghapus kontraktor: ' + error.message);
    },
  });

  const handleAdd = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: MasterKontraktorType) => {
    setEditingId(item.id);
    form.setValue('nama_kontraktor', item.nama_kontraktor);
    form.setValue('alamat', item.alamat || '');
    form.setValue('telepon', item.telepon || '');
    form.setValue('status', item.status as StatusMaster);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const exportColumns: ExportColumn<MasterKontraktorType>[] = [
    { header: 'Nama Kontraktor', accessor: (r) => r.nama_kontraktor },
    { header: 'Alamat', accessor: (r) => r.alamat ?? '-' },
    { header: 'Telepon', accessor: (r) => r.telepon ?? '-' },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Dibuat', accessor: (r) => formatDate(r.created_at) },
  ];

  const columns: ColumnDef<MasterKontraktorType>[] = [
    { accessorKey: 'nama_kontraktor', header: 'Nama Kontraktor' },
    {
      accessorKey: 'alamat',
      header: 'Alamat',
      cell: ({ row }) => row.original.alamat ?? '-',
    },
    {
      accessorKey: 'telepon',
      header: 'Telepon',
      cell: ({ row }) => row.original.telepon ?? '-',
    },
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
        title="Master Kontraktor"
        description="Kelola data kontraktor"
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kontraktor
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => kontraktors && exportToExcel(kontraktors, exportColumns, 'master-kontraktor', 'Kontraktor')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" onClick={() => kontraktors && exportToPDF(kontraktors, exportColumns, 'master-kontraktor', 'Daftar Kontraktor')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => kontraktors && printData(kontraktors, exportColumns, 'Daftar Kontraktor')}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable columns={columns} data={kontraktors || []} searchPlaceholder="Cari kontraktor..." searchKeys={['nama_kontraktor']} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Kontraktor' : 'Tambah Kontraktor'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi kontraktor' : 'Tambahkan kontraktor baru ke sistem'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_kontraktor">Nama Kontraktor</Label>
              <Input id="nama_kontraktor" placeholder="Masukkan nama kontraktor" {...form.register('nama_kontraktor')} />
              {form.formState.errors.nama_kontraktor && (
                <p className="text-sm text-destructive">{form.formState.errors.nama_kontraktor.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alamat">Alamat</Label>
              <Input id="alamat" placeholder="Masukkan alamat (opsional)" {...form.register('alamat')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telepon">Telepon</Label>
              <Input id="telepon" placeholder="Masukkan nomor telepon (opsional)" {...form.register('telepon')} />
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
        title="Hapus Kontraktor"
        description="Apakah Anda yakin ingin menghapus kontraktor ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
