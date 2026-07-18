export type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
  }
  if (!/^https:\/\/[^\s]+\.supabase\.co$/.test(supabaseUrl)) {
    throw new Error("VITE_SUPABASE_URL must be a valid Supabase project URL");
  }
  return { supabaseUrl, supabaseAnonKey };
}

export function getEnvConfig(): EnvConfig {
  return validateEnv(import.meta.env);
}
