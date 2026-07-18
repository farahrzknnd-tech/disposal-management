import { Navigate, Outlet } from "react-router-dom";
import type { AppRole } from "@/lib/database.types";
import { useAuth } from "@/lib/auth";

export function RequireRole({ roles }: { roles: AppRole[] }) {
  const { loading, hasRole } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Memeriksa akses...</div>;
  if (!hasRole(roles)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
