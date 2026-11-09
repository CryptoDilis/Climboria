import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.CLIMBORIA_AUTH_CONFIG || {};
const statusNode = document.getElementById("authStatus");
const modal = document.getElementById("authModal");
const setStatus = (message) => { if (statusNode) statusNode.textContent = message; };
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "")
  && typeof config.supabaseAnonKey === "string"
  && config.supabaseAnonKey.length > 20;

if (!configured) {
  setStatus("Account sign-in is not configured yet. Guest play remains available.");
} else {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.climboriaAuth = Object.freeze({
    getSession: () => supabase.auth.getSession(),
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setStatus("Signed out. Your guest/local data remains on this device.");
    }
  });

  const email = document.getElementById("authEmail");
  const password = document.getElementById("authPassword");
  const emailSubmit = document.getElementById("authEmailSubmit");
  const google = document.getElementById("authGoogle");
  const logout = document.getElementById("authLogout");

  const reportAuth = async (operation) => {
    setStatus("Please wait…");
    try {
      const { data, error } = await operation();
      if (error) throw error;
      if (data?.session || data?.user) {
        setStatus(data.session
          ? "Signed in. Your Climboria account is connected."
          : "Check your email to verify your Climboria account.");
      } else {
        setStatus("Authentication request completed. Check your email if verification is required.");
      }
    } catch (error) {
      setStatus(error?.message || "Sign-in failed. Please try again.");
    }
  };

  emailSubmit?.addEventListener("click", async () => {
    const address = email?.value?.trim();
    const secret = password?.value || "";
    if (!address || !secret) return setStatus("Enter your email and password.");
    if (secret.length < 8) return setStatus("Use a password with at least 8 characters.");
    const mode = emailSubmit.dataset.mode === "signup" ? "signup" : "signin";
    await reportAuth(() => mode === "signup"
      ? supabase.auth.signUp({ email: address, password: secret, options: { emailRedirectTo: location.origin } })
      : supabase.auth.signInWithPassword({ email: address, password: secret }));
  });

  google?.addEventListener("click", async () => {
    await reportAuth(() => supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin }
    }));
  });

  logout?.addEventListener("click", () => reportAuth(() => supabase.auth.signOut()));

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      setStatus("Signed in · " + (session.user.email || "Climboria player"));
      document.dispatchEvent(new CustomEvent("climboria:auth", {
        detail: { event, userId: session.user.id }
      }));
    } else if (event === "SIGNED_OUT") {
      setStatus("Signed out. Guest play remains available.");
      document.dispatchEvent(new CustomEvent("climboria:auth", { detail: { event } }));
    }
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) setStatus("Signed in · " + (session.user.email || "Climboria player"));
}
