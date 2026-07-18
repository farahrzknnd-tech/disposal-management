import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
  if (!loading && session) return <Navigate to={from} replace />;
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error("Login gagal", { description: error.message });
    navigate(from, { replace: true });
  }
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><Card className="w-full max-w-sm"><CardHeader><CardTitle>Login Disposal Management</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={onSubmit}><div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div><Button className="w-full" disabled={submitting}>{submitting ? "Masuk..." : "Masuk"}</Button></form></CardContent></Card></main>;
}
