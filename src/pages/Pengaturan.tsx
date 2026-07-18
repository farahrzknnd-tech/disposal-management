import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import {
  useSpks,
  useBatchs,
  useSuratJalan,
  useVendors,
  useClusters,
  useKontraktors,
  useAuditLogs,
} from "@/hooks/useGlobalData";
import { exportToExcel, type ExportColumn } from "@/lib/export";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  footer: string;
}

interface PriceSettings {
  pickupPrice: number;
  damTruckPrice: number;
}

interface DocumentFormats {
  batchFormat: string;
  spkFormat: string;
  tagihanFormat: string;
}

interface SummaryRow {
  dataType: string;
  count: number;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: "PT. Debris Disposal",
  address: "Jakarta",
  phone: "021-1234567",
  email: "info@debris.com",
  footer: "Created by Farah Ananda",
};

const DEFAULT_PRICES: PriceSettings = {
  pickupPrice: 100_000,
  damTruckPrice: 170_000,
};

const DEFAULT_FORMATS: DocumentFormats = {
  batchFormat: "BATCH-{MM}/{YYYY}",
  spkFormat: "SPK-{MM}/{YYYY}/{000}",
  tagihanFormat: "INV-{MM}/{YYYY}/{000}",
};

export default function Pengaturan() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>(DEFAULT_PRICES);
  const [documentFormats, setDocumentFormats] = useState<DocumentFormats>(DEFAULT_FORMATS);

  const { data: suratJalans = [] } = useSuratJalan();
  const { data: batchs = [] } = useBatchs();
  const { data: spks = [] } = useSpks();
  const { data: vendors = [] } = useVendors();
  const { data: clusters = [] } = useClusters();
  const { data: kontraktors = [] } = useKontraktors();
  const { data: auditLogs = [] } = useAuditLogs();

  useEffect(() => {
    const savedCompany = localStorage.getItem("company_info");
    const savedPrices = localStorage.getItem("price_settings");
    const savedFormats = localStorage.getItem("document_formats");

    if (savedCompany) {
      try { setCompanyInfo(JSON.parse(savedCompany)); } catch { /* keep default */ }
    }
    if (savedPrices) {
      try { setPriceSettings(JSON.parse(savedPrices)); } catch { /* keep default */ }
    }
    if (savedFormats) {
      try { setDocumentFormats(JSON.parse(savedFormats)); } catch { /* keep default */ }
    }
  }, []);

  const handleSaveCompanyInfo = () => {
    localStorage.setItem("company_info", JSON.stringify(companyInfo));
    toast.success("Informasi perusahaan berhasil disimpan");
  };

  const handleSavePriceSettings = () => {
    localStorage.setItem("price_settings", JSON.stringify(priceSettings));
    toast.success("Pengaturan harga berhasil disimpan");
  };

  const handleSaveDocumentFormats = () => {
    localStorage.setItem("document_formats", JSON.stringify(documentFormats));
    toast.success("Format dokumen berhasil disimpan");
  };

  const handleExportDatabase = () => {
    const summaryData: SummaryRow[] = [
      { dataType: "Surat Jalan", count: suratJalans.length },
      { dataType: "Batch", count: batchs.length },
      { dataType: "SPK", count: spks.length },
      { dataType: "Vendor", count: vendors.length },
      { dataType: "Cluster", count: clusters.length },
      { dataType: "Kontraktor", count: kontraktors.length },
      { dataType: "Audit Log", count: auditLogs.length },
    ];

    const columns: ExportColumn<SummaryRow>[] = [
      { header: "Tipe Data", accessor: (r) => r.dataType },
      { header: "Jumlah", accessor: (r) => r.count },
    ];

    exportToExcel(summaryData, columns, "Database_Backup");
    toast.success("Database berhasil diekspor");
  };

  const handleDownloadTemplate = () => {
    interface TemplateRow {
      nomorSJ: string;
      tanggal: string;
      vendor: string;
      cluster: string;
      pickup: number;
      damTruck: number;
    }

    const templateData: TemplateRow[] = [
      { nomorSJ: "SJ-2025-001", tanggal: "2025-01-01", vendor: "Vendor A", cluster: "Cluster A", pickup: 10, damTruck: 5 },
      { nomorSJ: "SJ-2025-002", tanggal: "2025-01-02", vendor: "Vendor B", cluster: "Cluster B", pickup: 8, damTruck: 3 },
    ];

    const columns: ExportColumn<TemplateRow>[] = [
      { header: "Nomor SJ", accessor: (r) => r.nomorSJ },
      { header: "Tanggal", accessor: (r) => r.tanggal },
      { header: "Vendor", accessor: (r) => r.vendor },
      { header: "Cluster", accessor: (r) => r.cluster },
      { header: "Pickup", accessor: (r) => r.pickup },
      { header: "Dam Truck", accessor: (r) => r.damTruck },
    ];

    exportToExcel(templateData, columns, "Template_Import_SJ");
    toast.success("Template berhasil diunduh");
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    toast.success("File berhasil diunggah (fitur import sedang dikembangkan)");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Pengaturan aplikasi" />

      <Card>
        <CardHeader><CardTitle className="text-base">Informasi Perusahaan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Nama Perusahaan</Label>
              <Input id="company-name" value={companyInfo.name} onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })} placeholder="Nama perusahaan" />
            </div>
            <div>
              <Label htmlFor="company-phone">Telepon</Label>
              <Input id="company-phone" value={companyInfo.phone} onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })} placeholder="Nomor telepon" />
            </div>
            <div>
              <Label htmlFor="company-address">Alamat</Label>
              <Input id="company-address" value={companyInfo.address} onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })} placeholder="Alamat perusahaan" />
            </div>
            <div>
              <Label htmlFor="company-email">Email</Label>
              <Input id="company-email" value={companyInfo.email} onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })} placeholder="Email perusahaan" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company-footer">Footer Dokumen</Label>
              <Input id="company-footer" value={companyInfo.footer} onChange={(e) => setCompanyInfo({ ...companyInfo, footer: e.target.value })} placeholder="Teks footer" />
            </div>
          </div>
          <Button onClick={handleSaveCompanyInfo}>Simpan Perubahan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pengaturan Harga</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup-price">Harga Pickup (Rp)</Label>
              <Input id="pickup-price" type="number" value={priceSettings.pickupPrice} onChange={(e) => setPriceSettings({ ...priceSettings, pickupPrice: parseInt(e.target.value) || 0 })} placeholder="Harga pickup" />
            </div>
            <div>
              <Label htmlFor="damtruck-price">Harga Dam Truck (Rp)</Label>
              <Input id="damtruck-price" type="number" value={priceSettings.damTruckPrice} onChange={(e) => setPriceSettings({ ...priceSettings, damTruckPrice: parseInt(e.target.value) || 0 })} placeholder="Harga dam truck" />
            </div>
          </div>
          <Button onClick={handleSavePriceSettings}>Simpan Perubahan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Format Nomor Dokumen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="batch-format">Format Batch</Label>
            <Input id="batch-format" value={documentFormats.batchFormat} onChange={(e) => setDocumentFormats({ ...documentFormats, batchFormat: e.target.value })} placeholder="BATCH-{MM}/{YYYY}" />
            <p className="text-xs text-muted-foreground mt-1">Gunakan {"{MM}"} untuk bulan, {"{YYYY}"} untuk tahun</p>
          </div>
          <div>
            <Label htmlFor="spk-format">Format SPK</Label>
            <Input id="spk-format" value={documentFormats.spkFormat} onChange={(e) => setDocumentFormats({ ...documentFormats, spkFormat: e.target.value })} placeholder="SPK-{MM}/{YYYY}/{000}" />
            <p className="text-xs text-muted-foreground mt-1">Gunakan {"{MM}"} untuk bulan, {"{YYYY}"} untuk tahun, {"{000}"} untuk nomor urut</p>
          </div>
          <div>
            <Label htmlFor="tagihan-format">Format Tagihan</Label>
            <Input id="tagihan-format" value={documentFormats.tagihanFormat} onChange={(e) => setDocumentFormats({ ...documentFormats, tagihanFormat: e.target.value })} placeholder="INV-{MM}/{YYYY}/{000}" />
            <p className="text-xs text-muted-foreground mt-1">Gunakan {"{MM}"} untuk bulan, {"{YYYY}"} untuk tahun, {"{000}"} untuk nomor urut</p>
          </div>
          <Button onClick={handleSaveDocumentFormats}>Simpan Perubahan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Backup &amp; Restore</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Ekspor semua data aplikasi ke file Excel</p>
            <Button onClick={handleExportDatabase} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Ekspor Database</Button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Unduh template untuk import data</p>
            <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Unduh Template Excel</Button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Impor data dari file Excel</p>
            <div className="flex items-center gap-2">
              <Input id="import-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleImportData} className="hidden" />
              <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()} className="gap-2"><Upload className="h-4 w-4" /> Pilih File</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
