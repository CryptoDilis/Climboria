import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let clientPromise;

export function getClimboriaSupabase() {
  const config = window.CLIMBORIA_AUTH_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "")
    && typeof config.supabaseAnonKey === "string"
    && config.supabaseAnonKey.length > 20;

  if (!configured) return null;
  if (!clientPromise) {
    clientPromise = Promise.resolve(createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    }));
  }
  return clientPromise;
}
