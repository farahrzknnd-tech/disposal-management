import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function RequireAuth() {
  const { loading, session } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Memulihkan sesi...</div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
