import React from "react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { if (import.meta.env.DEV) console.error(error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="min-h-screen p-8"><h1 className="text-2xl font-semibold">Aplikasi bermasalah</h1><p className="mt-2 text-muted-foreground">Muat ulang halaman atau hubungi admin.</p><Button className="mt-4" onClick={() => location.reload()}>Muat ulang</Button></div>;
  }
}
