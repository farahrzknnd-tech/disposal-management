import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { supabase, logActivity } from '@/lib/supabase';
import type { MasterCluster as MasterClusterType, StatusMaster } from '@/lib/types';
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
  nama_cluster: z.string().min(1, 'Nama cluster harus diisi'),
  status: z.enum(['Aktif', 'Nonaktif']),
});

type FormValues = z.infer<typeof formSchema>;

export default function MasterCluster() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_cluster: '',
      status: 'Aktif',
    },
  });

  const { data: clusters, isLoading } = useQuery({
    queryKey: ['master_cluster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_cluster')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as MasterClusterType[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('master_cluster')
        .insert([values])
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_cluster'] });
      logActivity(`Tambah cluster ${data?.nama_cluster ?? ''}`);
      toast.success('Cluster berhasil ditambahkan');
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal menambahkan cluster: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!editingId) throw new Error('ID tidak ditemukan');
      const { data, error } = await supabase
        .from('master_cluster')
        .update(values)
        .eq('id', editingId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['master_cluster'] });
      logActivity(`Update cluster ${data?.nama_cluster ?? ''}`);
      toast.success('Cluster berhasil diperbarui');
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (error) => {
      toast.error('Gagal memperbarui cluster: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('master_cluster').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_cluster'] });
      logActivity('Hapus cluster');
      toast.success('Cluster berhasil dihapus');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error('Gagal menghapus cluster: ' + error.message);
    },
  });

  const handleAdd = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (cluster: MasterClusterType) => {
    setEditingId(cluster.id);
    form.setValue('nama_cluster', cluster.nama_cluster);
    form.setValue('status', cluster.status as StatusMaster);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const exportColumns: ExportColumn<MasterClusterType>[] = [
    { header: 'Nama Cluster', accessor: (r) => r.nama_cluster },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Dibuat', accessor: (r) => formatDate(r.created_at) },
  ];

  const columns: ColumnDef<MasterClusterType>[] = [
    { accessorKey: 'nama_cluster', header: 'Nama Cluster' },
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
        title="Master Cluster"
        description="Kelola data cluster"
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Cluster
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => clusters && exportToExcel(clusters, exportColumns, 'master-cluster', 'Cluster')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" onClick={() => clusters && exportToPDF(clusters, exportColumns, 'master-cluster', 'Daftar Cluster')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => clusters && printData(clusters, exportColumns, 'Daftar Cluster')}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable columns={columns} data={clusters || []} searchPlaceholder="Cari cluster..." searchKeys={['nama_cluster']} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Cluster' : 'Tambah Cluster'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi cluster' : 'Tambahkan cluster baru ke sistem'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_cluster">Nama Cluster</Label>
              <Input id="nama_cluster" placeholder="Masukkan nama cluster" {...form.register('nama_cluster')} />
              {form.formState.errors.nama_cluster && (
                <p className="text-sm text-destructive">{form.formState.errors.nama_cluster.message}</p>
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
        title="Hapus Cluster"
        description="Apakah Anda yakin ingin menghapus cluster ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
