import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getEnvConfig } from "./env";

export const envError = (() => {
  try { getEnvConfig(); return null; } catch (error) { return error as Error; }
})();

const config = envError ? { supabaseUrl: "https://invalid.supabase.co", supabaseAnonKey: "invalid" } : getEnvConfig();

const typedSupabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabase: any = typedSupabase;

export { logActivity } from "./api";
