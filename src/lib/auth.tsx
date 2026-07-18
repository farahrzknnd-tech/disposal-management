import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { AppRole } from "./database.types";

export type Profile = { id: string; email: string | null; full_name: string | null; role: AppRole };

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  signOut: () => Promise<void>;
  hasRole: (roles: AppRole[]) => boolean;
  canWrite: boolean;
  canAdmin: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(user: User | null): Promise<Profile | null> {
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? { id: user.id, email: user.email ?? null, full_name: null, role: "VIEWER" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        setSession(data.session);
        setProfile(await fetchProfile(data.session?.user ?? null));
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      fetchProfile(nextSession?.user ?? null).then(setProfile).finally(() => setLoading(false));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const role = profile?.role ?? null;
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      signOut: async () => { await supabase.auth.signOut(); },
      hasRole: (roles) => !!role && roles.includes(role),
      canWrite: role === "ADMIN" || role === "OPERATOR",
      canAdmin: role === "ADMIN",
    };
  }, [loading, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
