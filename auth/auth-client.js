import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.CLIMBORIA_AUTH_CONFIG || {};
const statusNode = document.getElementById("authStatus");
const setStatus = (message) => { if (statusNode) statusNode.textContent = message; };
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "")
  && typeof config.supabaseAnonKey === "string"
  && config.supabaseAnonKey.length > 20;

if (!configured) {
  setStatus("Account sign-in is not configured yet. Guest play remains available.");
} else {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  });
  const byId = (id) => document.getElementById(id);
  const email = byId("authEmail");
  const password = byId("authPassword");
  const emailSubmit = byId("authEmailSubmit");
  const modeToggle = byId("authModeToggle");
  const recoveryPanel = byId("authRecoveryPanel");
  const newPassword = byId("authNewPassword");
  const accountStatus = byId("authAccountStatus");

  const reportAuth = async (operation, successMessage) => {
    setStatus("Please wait…");
    try {
      const { data, error } = await operation();
      if (error) throw error;
      setStatus(successMessage(data));
      return data;
    } catch (error) {
      setStatus(error?.message || "Authentication failed. Please try again.");
      return null;
    }
  };

  const refreshAccount = async (session) => {
    if (!session?.user) {
      if (accountStatus) accountStatus.textContent = "Guest session";
      byId("authLogout")?.setAttribute("hidden", "");
      return;
    }
    if (accountStatus) accountStatus.textContent = "Signed in · " + (session.user.email || "Wallet player");
    byId("authLogout")?.removeAttribute("hidden");
    const { data, error } = await supabase
      .from("player_profiles")
      .select("player_id, username")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!error && data && accountStatus) {
      accountStatus.textContent = (data.username ? data.username + " · " : "") + data.player_id;
    }
    document.dispatchEvent(new CustomEvent("climboria:auth", {
      detail: { event: "SESSION_READY", userId: session.user.id, profile: data || null }
    }));
  };

  window.climboriaAuth = Object.freeze({
    getSession: () => supabase.auth.getSession(),
    getUser: () => supabase.auth.getUser(),
    getProfile: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return { data: null, error: userError || new Error("Not signed in") };
      return supabase.from("player_profiles").select("player_id, username, created_at").eq("user_id", user.id).maybeSingle();
    },
    getIdentities: () => supabase.auth.getUserIdentities(),
    linkGoogle: () => supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: location.origin } }),
    linkX: () => supabase.auth.linkIdentity({ provider: "x", options: { redirectTo: location.origin } }),
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  });

  emailSubmit?.addEventListener("click", async () => {
    const address = email?.value?.trim();
    const secret = password?.value || "";
    if (!address || !secret) return setStatus("Enter your email and password.");
    if (secret.length < 8) return setStatus("Use a password with at least 8 characters.");
    const mode = emailSubmit.dataset.mode === "signup" ? "signup" : "signin";
    const data = await reportAuth(
      () => mode === "signup"
        ? supabase.auth.signUp({ email: address, password: secret, options: { emailRedirectTo: location.origin } })
        : supabase.auth.signInWithPassword({ email: address, password: secret }),
      (result) => result?.session
        ? "Signed in successfully."
        : "Request received. Check your email if confirmation is required."
    );
    if (data?.session) await refreshAccount(data.session);
  });

  modeToggle?.addEventListener("click", () => {
    const signingUp = emailSubmit?.dataset.mode !== "signup";
    if (emailSubmit) {
      emailSubmit.dataset.mode = signingUp ? "signup" : "signin";
      const label = emailSubmit.querySelector("span");
      if (label) label.textContent = signingUp ? "Create account" : "Sign in with email";
    }
    if (password) password.autocomplete = signingUp ? "new-password" : "current-password";
    const label = modeToggle.querySelector("span");
    if (label) label.textContent = signingUp ? "I already have an account" : "Create a new account instead";
    setStatus(signingUp ? "Create your account. Email verification may be required." : "Sign in with your existing account.");
  });

  byId("authForgotPassword")?.addEventListener("click", async () => {
    const address = email?.value?.trim();
    if (!address) return setStatus("Enter your email address first.");
    await reportAuth(
      () => supabase.auth.resetPasswordForEmail(address, { redirectTo: location.origin + "/?auth=recovery" }),
      () => "If an account exists for that address, a password reset email has been sent."
    );
  });

  byId("authSavePassword")?.addEventListener("click", async () => {
    const value = newPassword?.value || "";
    if (value.length < 8) return setStatus("Your new password must be at least 8 characters.");
    const data = await reportAuth(
      () => supabase.auth.updateUser({ password: value }),
      () => "Password updated. You can continue playing."
    );
    if (data && recoveryPanel) recoveryPanel.hidden = true;
    if (newPassword) newPassword.value = "";
  });

  const startOAuth = (provider) => reportAuth(
    () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin } }),
    () => "Redirecting to " + (provider === "x" ? "X" : "Google") + "…"
  );
  byId("authGoogle")?.addEventListener("click", () => startOAuth("google"));
  byId("authX")?.addEventListener("click", () => startOAuth("x"));

  byId("authEvm")?.addEventListener("click", async () => {
    if (!window.ethereum?.request) return setStatus("No EVM wallet detected. Open Climboria in MetaMask or another EVM wallet browser.");
    const data = await reportAuth(
      () => supabase.auth.signInWithWeb3({ chain: "ethereum", wallet: window.ethereum, statement: "Sign in to Climboria. This signature proves wallet ownership only; it does not authorize a transaction." }),
      () => "Wallet authentication completed."
    );
    if (data?.session) await refreshAccount(data.session);
  });

  byId("authSolana")?.addEventListener("click", async () => {
    const wallet = window.phantom?.solana || window.solana;
    if (!wallet || typeof wallet.connect !== "function") return setStatus("No Solana wallet detected. Open Climboria in Phantom, Solflare, Backpack, or another compatible wallet browser.");
    const data = await reportAuth(async () => {
      if (!wallet.isConnected) await wallet.connect();
      return supabase.auth.signInWithWeb3({ chain: "solana", wallet, statement: "Sign in to Climboria. This signature proves wallet ownership only; it does not authorize a transaction." });
    }, () => "Wallet authentication completed.");
    if (data?.session) await refreshAccount(data.session);
  });

  byId("authLogout")?.addEventListener("click", async () => {
    const data = await reportAuth(() => supabase.auth.signOut(), () => "Signed out. Your guest/local progress remains on this device.");
    if (data !== null) await refreshAccount(null);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && recoveryPanel) recoveryPanel.hidden = false;
    if (event === "SIGNED_OUT") refreshAccount(null);
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      queueMicrotask(() => refreshAccount(session));
    }
  });

  const { data: { session } } = await supabase.auth.getSession();
  await refreshAccount(session);
  if (new URLSearchParams(location.search).get("auth") === "recovery" && session && recoveryPanel) {
    recoveryPanel.hidden = false;
    setStatus("Choose a new password for your Climboria account.");
  }
}
