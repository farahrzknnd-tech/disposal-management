import { describe, expect, it } from "vitest";
import { validateEnv } from "../env";

describe("validateEnv", () => {
  it("accepts Supabase config", () => {
    expect(validateEnv({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_ANON_KEY: "anon" })).toEqual({ supabaseUrl: "https://abc.supabase.co", supabaseAnonKey: "anon" });
  });
  it("rejects missing config", () => {
    expect(() => validateEnv({})).toThrow("Missing required Supabase environment variables");
  });
});
