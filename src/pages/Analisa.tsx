import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { useSuratJalan, useBatchs, useSpks, useVendors, useClusters } from "@/hooks/useGlobalData";
import { formatRupiah, getShortMonthName } from "@/lib/format";
import { sumBy } from "@/lib/utils";
import type { Batch, Spk, SuratJalan, MasterVendor, MasterCluster } from "@/lib/types";

type DateRange = "bulan_ini" | "3_bulan" | "6_bulan" | "1_tahun";

export default function Analisa() {
  const { data: suratJalan = [] } = useSuratJalan();
  const { data: batchs = [] } = useBatchs();
  const { data: spks = [] } = useSpks();
  const { data: vendors = [] } = useVendors();
  const { data: clusters = [] } = useClusters();
  const [dateRange, setDateRange] = useState<DateRange>("6_bulan");

  const monthCount = useMemo(() => {
    switch (dateRange) {
      case "bulan_ini": return 1;
      case "3_bulan": return 3;
      case "6_bulan": return 6;
      case "1_tahun": return 12;
    }
  }, [dateRange]);

  const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const months = useMemo(() => {
    const result: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ key: getMonthKey(d), label: `${getShortMonthName(d.getMonth())} ${d.getFullYear()}` });
    }
    return result;
  }, [monthCount]);

  const sjPerMonth = useMemo(() => {
    return months.map((m) => ({
      month: m.label,
      count: suratJalan.filter((s: SuratJalan) => s.tanggal?.startsWith(m.key)).length,
    }));
  }, [suratJalan, months]);

  const batchPerMonth = useMemo(() => {
    return months.map((m) => ({
      month: m.label,
      count: batchs.filter((b: Batch) => b.created_at?.startsWith(m.key)).length,
    }));
  }, [batchs, months]);

  const spkValuePerMonth = useMemo(() => {
    return months.map((m) => ({
      month: m.label,
      value: sumBy(
        spks.filter((s: Spk) => s.tanggal_spk?.startsWith(m.key)),
        (s: Spk) => s.nominal_spk ?? 0
      ),
    }));
  }, [spks, months]);

  const tagihanValuePerMonth = useMemo(() => {
    return months.map((m) => ({
      month: m.label,
      value: sumBy(
        spks.filter((s: Spk) => s.tanggal_tagihan?.startsWith(m.key)),
        (s: Spk) => s.nominal_tagihan ?? 0
      ),
    }));
  }, [spks, months]);

  const sjByVehicle = useMemo(() => {
    const grouped: Record<string, number> = {};
    suratJalan.forEach((s: SuratJalan) => {
      const jenis = s.jenis_kendaraan ?? "Lainnya";
      grouped[jenis] = (grouped[jenis] ?? 0) + 1;
    });
    const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
    return Object.entries(grouped).map(([name, value], idx) => ({
      name, value, color: COLORS[idx % COLORS.length],
    }));
  }, [suratJalan]);

  const topVendors = useMemo(() => {
    const counts: Record<string, number> = {};
    suratJalan.forEach((s: SuratJalan) => {
      const id = s.vendor_id ?? "unknown";
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([vendorId, count]) => ({
        name: vendors.find((v: MasterVendor) => v.id === vendorId)?.nama_vendor ?? vendorId,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [suratJalan, vendors]);

  const topClusters = useMemo(() => {
    const vals: Record<string, number> = {};
    spks.forEach((s: Spk) => {
      const id = s.cluster_id;
      vals[id] = (vals[id] ?? 0) + (s.nominal_spk ?? 0);
    });
    return Object.entries(vals)
      .map(([clusterId, value]) => ({
        name: clusters.find((c: MasterCluster) => c.id === clusterId)?.nama_cluster ?? clusterId,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [spks, clusters]);

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    spks.forEach((s: Spk) => {
      const st = s.status ?? "Draft";
      dist[st] = (dist[st] ?? 0) + 1;
    });
    const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
    return Object.entries(dist).map(([name, value], idx) => ({
      name, value, color: COLORS[idx % COLORS.length],
    }));
  }, [spks]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Analisa" description="Analisa performa dan tren" />
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
            <SelectItem value="3_bulan">3 Bulan</SelectItem>
            <SelectItem value="6_bulan">6 Bulan</SelectItem>
            <SelectItem value="1_tahun">1 Tahun</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">SJ Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{suratJalan.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Batch Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{batchs.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">SPK Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{spks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Nilai SPK</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatRupiah(sumBy(spks, (s: Spk) => s.nominal_spk ?? 0))}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>SJ per Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sjPerMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Batch per Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batchPerMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nilai SPK per Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spkValuePerMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nilai Tagihan per Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tagihanValuePerMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Line type="monotone" dataKey="value" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>SJ by Jenis Kendaraan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sjByVehicle} cx="50%" cy="50%" labelLine={false} label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                  {sjByVehicle.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top 5 Vendor by SJ</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVendors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top 5 Cluster by SPK Value</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topClusters}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Bar dataKey="value" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
