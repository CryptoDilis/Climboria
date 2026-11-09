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
  const xLogin = document.getElementById("authX");
  const evm = document.getElementById("authEvm");
  const solana = document.getElementById("authSolana");
  const logout = document.getElementById("authLogout");
  const modeToggle = document.getElementById("authModeToggle");

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

  modeToggle?.addEventListener("click", () => {
    const signingUp = emailSubmit?.dataset.mode !== "signup";
    if (emailSubmit) {
      emailSubmit.dataset.mode = signingUp ? "signup" : "signin";
      emailSubmit.querySelector("span").textContent = signingUp ? "Create account" : "Sign in with email";
    }
    if (password) password.autocomplete = signingUp ? "new-password" : "current-password";
    const label = modeToggle.querySelector("span");
    if (label) label.textContent = signingUp ? "I already have an account" : "Create a new account instead";
    setStatus(signingUp ? "Create your account with email. Verification may be required." : "Sign in with your existing Climboria account.");
  });

  evm?.addEventListener("click", async () => {
    if (!window.ethereum || typeof window.ethereum.request !== "function") {
      setStatus("No EVM wallet detected. Open Climboria in MetaMask or another EVM wallet browser.");
      return;
    }
    await reportAuth(() => supabase.auth.signInWithWeb3({
      chain: "ethereum",
      wallet: window.ethereum,
      statement: "Sign in to Climboria. This signature proves wallet ownership only; it does not authorize a transaction."
    }));
  });

  solana?.addEventListener("click", async () => {
    const wallet = window.phantom?.solana || window.solana;
    if (!wallet || typeof wallet.connect !== "function") {
      setStatus("No Solana wallet detected. Open Climboria in Phantom, Solflare, Backpack, or another Solana wallet browser.");
      return;
    }
    await reportAuth(async () => {
      if (!wallet.isConnected) await wallet.connect();
      return supabase.auth.signInWithWeb3({
        chain: "solana",
        wallet,
        statement: "Sign in to Climboria. This signature proves wallet ownership only; it does not authorize a transaction."
      });
    });
  });

  xLogin?.addEventListener("click", async () => {
    await reportAuth(() => supabase.auth.signInWithOAuth({
      provider: "x",
      options: { redirectTo: location.origin }
    }));
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
