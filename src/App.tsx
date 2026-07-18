import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SuratJalanData from "@/pages/surat-jalan/SuratJalanData";
import SuratJalanForm from "@/pages/surat-jalan/SuratJalanForm";
import BatchList from "@/pages/batch/BatchList";
import BatchDetail from "@/pages/batch/BatchDetail";
import SpkList from "@/pages/spk/SpkList";
import SpkDetail from "@/pages/spk/SpkDetail";
import Monitoring from "@/pages/Monitoring";
import RekapCluster from "@/pages/RekapCluster";
import Analisa from "@/pages/Analisa";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import Laporan from "@/pages/Laporan";
import AuditLog from "@/pages/AuditLog";
import MasterData from "@/pages/MasterData";
import Pengaturan from "@/pages/Pengaturan";
import ExportCenter from "@/pages/ExportCenter";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/surat-jalan" element={<SuratJalanData />} />
        <Route path="/surat-jalan/input" element={<SuratJalanForm />} />
        <Route path="/batch" element={<BatchList />} />
        <Route path="/batch/:id" element={<BatchDetail />} />
        <Route path="/spk" element={<SpkList />} />
        <Route path="/spk/:id" element={<SpkDetail />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/rekap-cluster" element={<RekapCluster />} />
        <Route path="/analisa" element={<Analisa />} />
        <Route path="/performance" element={<PerformanceDashboard />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/export" element={<ExportCenter />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/master-data" element={<MasterData />} />
        <Route path="/pengaturan" element={<Pengaturan />} />
      </Route>
    </Routes>
  );
}
