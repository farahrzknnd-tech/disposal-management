import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "n":
            e.preventDefault();
            window.location.href = "/surat-jalan/input";
            break;
          case "b":
            e.preventDefault();
            window.location.href = "/batch";
            break;
          case "s":
            e.preventDefault();
            window.location.href = "/spk";
            break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
