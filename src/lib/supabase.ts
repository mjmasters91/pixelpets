import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_URL = "https://esutqfkoyleeazzmjejt.supabase.co";
export const DEFAULT_KEY = "sb_publishable_tJm2iLZMQ-cq3kZ1S08nQw_H-ezHhKH";
export const SITE_URL = "https://mjmasters91.github.io/pixelpets/";

const SECRET = /service_role|sb_secret_/i;

function jwtRole(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function assertSafeEnv() {
  const env = import.meta.env as Record<string, unknown>;
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("VITE_") || typeof value !== "string") continue;
    if (SECRET.test(value) || jwtRole(value) === "service_role") {
      throw new Error("Refusing to boot: a service role or secret key was placed in a VITE_ variable.");
    }
  }
}

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });
  }
  return client;
}

export function redirectTo() {
  if (import.meta.env.DEV) {
    const base = import.meta.env.BASE_URL;
    return `${window.location.origin}${base}`;
  }
  return SITE_URL;
}

export async function readSession() {
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

export function friendlyDb(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("schema cache") ||
    lower.includes("does not exist") ||
    lower.includes("permission denied") ||
    lower.includes("relation") ||
    lower.includes("function") ||
    lower.includes("jwt")
  ) {
    return "The quay books are not ready yet. You can still look around, or add ?demo=1 for a sample town.";
  }
  return message;
}
