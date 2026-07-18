import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Package, FileSignature, DollarSign,
  Plus, Activity, BarChart3, ClipboardList, Truck, CheckCircle2, Clock,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { useSuratJalan, useBatchs, useSpks, useClusters } from "@/hooks/useGlobalData";
import { formatRupiah, formatDate, getShortMonthName } from "@/lib/format";
import { computeBatchStatus } from "@/lib/batchStatus";
import { buildBatchName, getBatchPeriod } from "@/lib/constants";
import type { SuratJalan, Batch, Spk } from "@/lib/types";

export default function Dashboard() {
  const { data: suratJalan = [] } = useSuratJalan();
  const { data: batchs = [] } = useBatchs();
  const { data: spks = [] } = useSpks();
  const { data: clusters = [] } = useClusters();

  const today = new Date().toISOString().slice(0, 10);

  // Workflow KPIs
  const kpis = useMemo(() => {
    const belumMasukBatch = suratJalan.filter((s) => !s.batch_id).length;
    const menungguQs = batchs.filter((b) => b.status === "Belum Dikirim").length;
    const spkTerbit = spks.filter((s) => s.nomor_spk && !s.nomor_tagihan && s.status !== "Selesai").length;
    const belumDitagihkan = spks.filter((s) => s.nomor_spk && !s.nomor_tagihan).length;
    const selesai = spks.filter((s) => s.status === "Selesai").length;
    return { belumMasukBatch, menungguQs, spkTerbit, belumDitagihkan, selesai };
  }, [suratJalan, batchs, spks]);

  // Current & Next batch (based on today's date)
  const batchInfo = useMemo(() => {
    const currentName = buildBatchName(today);
    const currentPeriod = getBatchPeriod(today);
    const currentBatch = batchs.find((b) => b.nama_batch === currentName) ?? null;

    // Next batch: flip segment, or next month segment I
    const d = new Date(today + "T00:00:00");
    const day = d.getDate();
    let nextDate: Date;
    if (day <= 15) {
      nextDate = new Date(d.getFullYear(), d.getMonth(), 16);
    } else {
      nextDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    const nextName = buildBatchName(nextDate);
    const nextPeriod = getBatchPeriod(nextDate);
    const nextBatch = batchs.find((b) => b.nama_batch === nextName) ?? null;
    return { currentName, currentPeriod, currentBatch, nextName, nextPeriod, nextBatch };
  }, [batchs, today]);

  const warnings = useMemo(() => {
    const items: { text: string; priority: "High" | "Medium" | "Low" }[] = [];
    suratJalan.forEach((s) => {
      if (!s.batch_id) items.push({ text: `SJ ${s.nomor_polisi ?? "tanpa polisi"} belum masuk batch`, priority: "Low" });
    });
    batchs.forEach((b) => {
      if (b.status === "Belum Dikirim") {
        const sjCount = (b as Batch & { surat_jalan?: SuratJalan[] }).surat_jalan?.length ?? 0;
        if (sjCount > 0) items.push({ text: `Batch ${b.nama_batch} belum dikirim ke QS`, priority: "Medium" });
      }
    });
    spks.forEach((s) => {
      if (s.nomor_spk && !s.nomor_tagihan && s.status !== "Selesai")
        items.push({ text: `SPK ${s.nomor_spk} belum ditagihkan`, priority: "Medium" });
    });
    return items.slice(0, 10);
  }, [spks, batchs, suratJalan]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { sj: number; batch: number; spkValue: number; tagihanValue: number }> = {};
    suratJalan.forEach((s) => {
      const m = s.tanggal?.substring(0, 7) ?? "";
      if (!months[m]) months[m] = { sj: 0, batch: 0, spkValue: 0, tagihanValue: 0 };
      months[m].sj++;
    });
    batchs.forEach((b) => {
      const m = b.created_at?.substring(0, 7) ?? "";
      if (!months[m]) months[m] = { sj: 0, batch: 0, spkValue: 0, tagihanValue: 0 };
      months[m].batch++;
    });
    spks.forEach((s) => {
      const m = s.tanggal_spk?.substring(0, 7) ?? "";
      if (m) {
        if (!months[m]) months[m] = { sj: 0, batch: 0, spkValue: 0, tagihanValue: 0 };
        months[m].spkValue += s.nominal_spk ?? 0;
        months[m].tagihanValue += s.nominal_tagihan ?? 0;
      }
    });
    return Object.entries(months).sort().slice(-6);
  }, [suratJalan, batchs, spks]);

  const quickActions = [
    { label: "Input SJ", path: "/surat-jalan/input", icon: Plus, color: "bg-blue-500" },
    { label: "Batch", path: "/batch", icon: Package, color: "bg-yellow-500" },
    { label: "SPK", path: "/spk", icon: FileSignature, color: "bg-emerald-500" },
    { label: "Monitoring", path: "/monitoring", icon: Activity, color: "bg-cyan-500" },
    { label: "Rekap", path: "/rekap-cluster", icon: BarChart3, color: "bg-orange-500" },
    { label: "Laporan", path: "/laporan", icon: ClipboardList, color: "bg-rose-500" },
  ];

  const statusCards = [
    { label: "Belum Masuk Batch", value: kpis.belumMasukBatch, icon: FileText, color: "text-gray-600", bg: "bg-gray-100" },
    { label: "Menunggu QS", value: kpis.menungguQs, icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "SPK Terbit", value: kpis.spkTerbit, icon: FileSignature, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "Belum Ditagihkan", value: kpis.belumDitagihkan, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Selesai", value: kpis.selesai, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan alur kerja debris disposal" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        {statusCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Berjalan</CardTitle>
            <CardDescription>Periode saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            {batchInfo.currentBatch ? (
              <Link to={`/batch/${batchInfo.currentBatch.id}`} className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-semibold">{batchInfo.currentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(batchInfo.currentPeriod.awal)} - {formatDate(batchInfo.currentPeriod.akhir)}
                    </p>
                  </div>
                  <StatusBadge status={batchInfo.currentBatch.status} />
                </div>
              </Link>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="font-semibold">{batchInfo.currentName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(batchInfo.currentPeriod.awal)} - {formatDate(batchInfo.currentPeriod.akhir)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Belum ada SJ pada batch ini</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Berikutnya</CardTitle>
            <CardDescription>Periode mendatang</CardDescription>
          </CardHeader>
          <CardContent>
            {batchInfo.nextBatch ? (
              <Link to={`/batch/${batchInfo.nextBatch.id}`} className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-semibold">{batchInfo.nextName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(batchInfo.nextPeriod.awal)} - {formatDate(batchInfo.nextPeriod.akhir)}
                    </p>
                  </div>
                  <StatusBadge status={batchInfo.nextBatch.status} />
                </div>
              </Link>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="font-semibold">{batchInfo.nextName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(batchInfo.nextPeriod.awal)} - {formatDate(batchInfo.nextPeriod.akhir)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Akan dibuat otomatis saat SJ masuk</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Akses cepat ke fitur utama</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.path}>
                  <Button variant="outline" className="h-20 w-full flex-col gap-1 hover:bg-muted/50">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${action.color} text-white`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peringatan</CardTitle>
            <CardDescription>Item yang perlu perhatian</CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada peringatan</p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      w.priority === "High" ? "bg-red-500" : w.priority === "Medium" ? "bg-yellow-500" : "bg-green-500"
                    }`} />
                    <span className="text-muted-foreground">{w.text}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Bulanan</CardTitle>
            <CardDescription>Jumlah SJ dan Batch per bulan (6 bulan terakhir)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map(([month, data]) => {
                  const [y, m] = month.split("-");
                  const label = `${getShortMonthName(parseInt(m) - 1)} ${y}`;
                  return (
                    <div key={month}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">SJ: {data.sj} | Batch: {data.batch}</span>
                      </div>
                      <div className="flex gap-1">
                        <Progress value={data.sj * 10} indicatorClassName="bg-blue-400" className="h-1.5" />
                        <Progress value={data.batch * 10} indicatorClassName="bg-yellow-400" className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nilai SPK & Tagihan Bulanan</CardTitle>
            <CardDescription>6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map(([month, data]) => {
                  const [y, m] = month.split("-");
                  const label = `${getShortMonthName(parseInt(m) - 1)} ${y}`;
                  return (
                    <div key={month} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                      <span className="font-medium">{label}</span>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">SPK: {formatRupiah(data.spkValue)}</p>
                        <p className="text-xs text-muted-foreground">Tagihan: {formatRupiah(data.tagihanValue)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {batchs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada batch</p>
            ) : (
              <div className="space-y-2">
                {batchs.slice(0, 5).map((b) => {
                  const spkList = (b as Batch & { spk?: Spk[] }).spk ?? [];
                  const status = computeBatchStatus(clusters.length, spkList, !!b.tanggal_kirim_qs);
                  return (
                    <Link key={b.id} to={`/batch/${b.id}`} className="block">
                      <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{b.nama_batch}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(b.created_at)}</p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SJ Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {suratJalan.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada surat jalan</p>
            ) : (
              <div className="space-y-2">
                {suratJalan.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.nomor_polisi ?? "Tanpa Polisi"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(s.tanggal)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatRupiah(s.total)}</p>
                      <p className="text-xs text-muted-foreground">{s.jenis_kendaraan ?? "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
