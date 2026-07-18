import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useVendors, useClusters, useKontraktors } from "@/hooks/useGlobalData";
import {
  createVendor, updateVendor, deleteVendor,
  createCluster, updateCluster, deleteCluster,
  createKontraktor, updateKontraktor, deleteKontraktor,
  logActivity,
} from "@/lib/api";
import type { MasterVendor, MasterCluster, MasterKontraktor } from "@/lib/types";

export default function MasterData() {
  const queryClient = useQueryClient();
  const { data: vendors = [] } = useVendors();
  const { data: clusters = [] } = useClusters();
  const { data: kontraktors = [] } = useKontraktors();

  const [vendorDialog, setVendorDialog] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [vendorForm, setVendorForm] = useState({ nama_vendor: "", status: "Aktif" });
  const [clusterDialog, setClusterDialog] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [clusterForm, setClusterForm] = useState({ nama_cluster: "", status: "Aktif" });
  const [kontraktorDialog, setKontraktorDialog] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [kontraktorForm, setKontraktorForm] = useState({ nama_kontraktor: "", alamat: "", telepon: "", status: "Aktif" });
  const [deleteTarget, setDeleteTarget] = useState<{ open: boolean; type: "vendor" | "cluster" | "kontraktor"; id: string }>({ open: false, type: "vendor", id: "" });

  const handleVendorSave = async () => {
    if (!vendorForm.nama_vendor.trim()) { toast.error("Nama vendor harus diisi"); return; }
    try {
      if (vendorDialog.editId) {
        await updateVendor(vendorDialog.editId, vendorForm);
        await logActivity(`Update vendor ${vendorForm.nama_vendor}`);
      } else {
        await createVendor(vendorForm);
        await logActivity(`Buat vendor ${vendorForm.nama_vendor}`);
      }
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorDialog({ open: false });
      toast.success("Vendor tersimpan");
    } catch { toast.error("Gagal menyimpan vendor"); }
  };

  const handleClusterSave = async () => {
    if (!clusterForm.nama_cluster.trim()) { toast.error("Nama cluster harus diisi"); return; }
    try {
      if (clusterDialog.editId) {
        await updateCluster(clusterDialog.editId, clusterForm);
        await logActivity(`Update cluster ${clusterForm.nama_cluster}`);
      } else {
        await createCluster(clusterForm);
        await logActivity(`Buat cluster ${clusterForm.nama_cluster}`);
      }
      queryClient.invalidateQueries({ queryKey: ["clusters"] });
      setClusterDialog({ open: false });
      toast.success("Cluster tersimpan");
    } catch { toast.error("Gagal menyimpan cluster"); }
  };

  const handleKontraktorSave = async () => {
    if (!kontraktorForm.nama_kontraktor.trim()) { toast.error("Nama kontraktor harus diisi"); return; }
    try {
      if (kontraktorDialog.editId) {
        await updateKontraktor(kontraktorDialog.editId, kontraktorForm);
        await logActivity(`Update kontraktor ${kontraktorForm.nama_kontraktor}`);
      } else {
        await createKontraktor(kontraktorForm);
        await logActivity(`Buat kontraktor ${kontraktorForm.nama_kontraktor}`);
      }
      queryClient.invalidateQueries({ queryKey: ["kontraktors"] });
      setKontraktorDialog({ open: false });
      toast.success("Kontraktor tersimpan");
    } catch { toast.error("Gagal menyimpan kontraktor"); }
  };

  const handleDelete = async () => {
    try {
      if (deleteTarget.type === "vendor") { await deleteVendor(deleteTarget.id); queryClient.invalidateQueries({ queryKey: ["vendors"] }); }
      else if (deleteTarget.type === "cluster") { await deleteCluster(deleteTarget.id); queryClient.invalidateQueries({ queryKey: ["clusters"] }); }
      else { await deleteKontraktor(deleteTarget.id); queryClient.invalidateQueries({ queryKey: ["kontraktors"] }); }
      await logActivity(`Hapus ${deleteTarget.type}`);
      toast.success("Data dihapus");
      setDeleteTarget({ ...deleteTarget, open: false });
    } catch { toast.error("Gagal menghapus data"); }
  };

  const vendorColumns: ColumnDef<MasterVendor>[] = [
    { accessorKey: "nama_vendor", header: "Nama Vendor" },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions", header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setVendorForm({ nama_vendor: row.original.nama_vendor, status: row.original.status }); setVendorDialog({ open: true, editId: row.original.id }); }}><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ open: true, type: "vendor", id: row.original.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const clusterColumns: ColumnDef<MasterCluster>[] = [
    { accessorKey: "nama_cluster", header: "Nama Cluster" },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions", header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setClusterForm({ nama_cluster: row.original.nama_cluster, status: row.original.status }); setClusterDialog({ open: true, editId: row.original.id }); }}><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ open: true, type: "cluster", id: row.original.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const kontraktorColumns: ColumnDef<MasterKontraktor>[] = [
    { accessorKey: "nama_kontraktor", header: "Nama Kontraktor" },
    { accessorKey: "alamat", header: "Alamat", cell: ({ row }) => row.original.alamat ?? "-" },
    { accessorKey: "telepon", header: "Telepon", cell: ({ row }) => row.original.telepon ?? "-" },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions", header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setKontraktorForm({ nama_kontraktor: row.original.nama_kontraktor, alamat: row.original.alamat ?? "", telepon: row.original.telepon ?? "", status: row.original.status }); setKontraktorDialog({ open: true, editId: row.original.id }); }}><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ open: true, type: "kontraktor", id: row.original.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Master Data" description="Kelola data master" />
      <Tabs defaultValue="vendor">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
          <TabsTrigger value="cluster">Cluster</TabsTrigger>
          <TabsTrigger value="kontraktor">Kontraktor</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="space-y-4">
          <Button onClick={() => { setVendorForm({ nama_vendor: "", status: "Aktif" }); setVendorDialog({ open: true }); }} className="gap-2"><Plus className="h-4 w-4" /> Tambah Vendor</Button>
          <DataTable columns={vendorColumns} data={vendors} searchPlaceholder="Cari vendor..." searchKeys={["nama_vendor"]} />
        </TabsContent>
        <TabsContent value="cluster" className="space-y-4">
          <Button onClick={() => { setClusterForm({ nama_cluster: "", status: "Aktif" }); setClusterDialog({ open: true }); }} className="gap-2"><Plus className="h-4 w-4" /> Tambah Cluster</Button>
          <DataTable columns={clusterColumns} data={clusters} searchPlaceholder="Cari cluster..." searchKeys={["nama_cluster"]} />
        </TabsContent>
        <TabsContent value="kontraktor" className="space-y-4">
          <Button onClick={() => { setKontraktorForm({ nama_kontraktor: "", alamat: "", telepon: "", status: "Aktif" }); setKontraktorDialog({ open: true }); }} className="gap-2"><Plus className="h-4 w-4" /> Tambah Kontraktor</Button>
          <DataTable columns={kontraktorColumns} data={kontraktors} searchPlaceholder="Cari kontraktor..." searchKeys={["nama_kontraktor"]} />
        </TabsContent>
      </Tabs>

      <Dialog open={vendorDialog.open} onOpenChange={(open) => setVendorDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{vendorDialog.editId ? "Edit Vendor" : "Tambah Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Vendor</Label><Input value={vendorForm.nama_vendor} onChange={(e) => setVendorForm({ ...vendorForm, nama_vendor: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={vendorForm.status} onValueChange={(v) => setVendorForm({ ...vendorForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setVendorDialog({ open: false })}>Batal</Button><Button onClick={handleVendorSave}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={clusterDialog.open} onOpenChange={(open) => setClusterDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{clusterDialog.editId ? "Edit Cluster" : "Tambah Cluster"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Cluster</Label><Input value={clusterForm.nama_cluster} onChange={(e) => setClusterForm({ ...clusterForm, nama_cluster: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={clusterForm.status} onValueChange={(v) => setClusterForm({ ...clusterForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setClusterDialog({ open: false })}>Batal</Button><Button onClick={handleClusterSave}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={kontraktorDialog.open} onOpenChange={(open) => setKontraktorDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{kontraktorDialog.editId ? "Edit Kontraktor" : "Tambah Kontraktor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Kontraktor</Label><Input value={kontraktorForm.nama_kontraktor} onChange={(e) => setKontraktorForm({ ...kontraktorForm, nama_kontraktor: e.target.value })} /></div>
            <div><Label>Alamat</Label><Input value={kontraktorForm.alamat} onChange={(e) => setKontraktorForm({ ...kontraktorForm, alamat: e.target.value })} /></div>
            <div><Label>Telepon</Label><Input value={kontraktorForm.telepon} onChange={(e) => setKontraktorForm({ ...kontraktorForm, telepon: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={kontraktorForm.status} onValueChange={(v) => setKontraktorForm({ ...kontraktorForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setKontraktorDialog({ open: false })}>Batal</Button><Button onClick={handleKontraktorSave}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget.open}
        onOpenChange={(open) => setDeleteTarget({ ...deleteTarget, open })}
        title="Hapus Data"
        description="Yakin ingin menghapus data ini?"
        confirmLabel="Hapus"
        onConfirm={handleDelete}
      />
    </div>
  );
}
