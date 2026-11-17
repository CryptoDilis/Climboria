/**
 * Optional, provider-managed, in-page Solana swap surface.
 * This module NEVER calls Climboria's /api/swap/order or /api/swap/execute,
 * signs a transaction, requests wallet keys or claims a completed trade.
 * The official provider must be verified separately before enabling.
 */
// The official Jupiter Plugin, not the legacy terminal.jup.ag script.
// The exact v1.0.18 bootstrap was independently hashed in the 2026-11-15
// source audit; this source pin does NOT verify dynamically inserted app JS/CSS.
const OFFICIAL_PLUGIN_HOST = "plugin.jup.ag";
const REVIEWED_BOOTSTRAP_PATH = "/plugin-1.0.18.js";
const SHA384_SRI = /^sha384-[A-Za-z0-9+/]{64}$/;

export function validateManagedProviderConfig(config) {
  if (!config || config.enabled !== true || config.runtimeApproved !== true || config.provider !== "jupiter-terminal" ||
      typeof config.scriptUrl !== "string" || typeof config.integrity !== "string" ||
      !SHA384_SRI.test(config.integrity)) return null;
  try {
    const url = new URL(config.scriptUrl);
    if (url.protocol !== "https:" || url.hostname !== OFFICIAL_PLUGIN_HOST ||
        url.port || url.username || url.password || url.search || url.hash ||
        url.pathname !== REVIEWED_BOOTSTRAP_PATH) return null;
    return Object.freeze({ url: url.href, integrity: config.integrity });
  } catch {
    return null;
  }
}

export function integratedTerminalOptions(targetId) {
  if (typeof targetId !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(targetId)) {
    throw new Error("A safe integrated Jupiter target ID is required");
  }
  return Object.freeze({ displayMode: "integrated", integratedTargetId: targetId });
}

/**
 * A previously approved page must not bypass a later production rollback.
 * Recheck before every widget open and immediately before provider init.
 */
export async function isManagedSwapRuntimeApproved(scope) {
  if (!scope || typeof scope.fetch !== "function") return false;
  try {
    const response = await scope.fetch("/swap-runtime-status.json", {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000)
    });
    const cachePolicy = response.headers.get("Cache-Control") ?? "";
    return response.status === 200 && /(?:^|,)\s*no-store\s*(?:,|$)/i.test(cachePolicy) &&
      (await response.json())?.enabled === true;
  } catch {
    return false;
  }
}

function loadReviewedScript(doc, source) {
  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = source.url;
    script.integrity = source.integrity;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.async = true;
    script.dataset.climboriaProviderScript = "jupiter-terminal";
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Provider script did not finish loading"));
    }, 12000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Reviewed provider script failed the load or integrity check"));
    };
    doc.head.appendChild(script);
  });
}

/**
 * This deliberately does not import or share Climboria's wallet provider.
 * Once explicitly enabled and source-pinned, the Jupiter widget alone owns
 * provider wallet prompts and on-chain swap submission.
 */
export function initializeManagedSwapHost({ doc, scope, config }) {
  const panel = doc.querySelector("[data-climboria-managed-swap-panel]");
  if (!panel) return { ready: false, reason: "no-host" };
  const buttons = [...doc.querySelectorAll("[data-climboria-managed-swap-open]")];
  const target = panel.querySelector("[data-climboria-managed-swap-target]");
  const status = panel.querySelector("[data-climboria-managed-swap-status]");
  const close = panel.querySelector("[data-climboria-managed-swap-close]");
  const approved = validateManagedProviderConfig(config);
  if (!approved || !target || !target.id || !status || !close || !buttons.length) {
    buttons.forEach(button => { button.hidden = true; });
    panel.hidden = true;
    return { ready: false, reason: "provider-not-approved" };
  }
  let loading = false;
  let mounted = false;
  let scriptLoaded = false;
  let lastTrigger = null;
  // Closing invalidates any pending script-load result. A late third-party
  // response must never mount wallet-enabled UI behind a closed panel.
  let openRequestId = 0;
  const expanded = value => buttons.forEach(button => button.setAttribute?.("aria-expanded", String(value)));
  // Even when a widget remains open, the operator may revoke the release
  // switch. Check periodically while the panel is visible. This only blocks
  // future interaction with the UI: an active third-party wallet prompt or
  // already signed/submitted transaction cannot be cancelled here.
  const ACTIVE_APPROVAL_POLL_MS = 15000;
  let activeCheckTimer = null;
  let activeCheckInFlight = false;
  let resumeCheckInFlight = false;
  const stopActiveApprovalChecks = () => {
    if (activeCheckTimer !== null) {
      scope.clearInterval?.(activeCheckTimer);
      activeCheckTimer = null;
    }
  };
  const recheckActivePanel = async () => {
    if (activeCheckInFlight || panel.hidden) return;
    activeCheckInFlight = true;
    const requestId = openRequestId;
    try {
      const stillApproved = await isManagedSwapRuntimeApproved(scope);
      if (requestId === openRequestId && !panel.hidden && !stillApproved) hideRevoked();
    } finally {
      activeCheckInFlight = false;
    }
  };
  const startActiveApprovalChecks = () => {
    if (activeCheckTimer === null && typeof scope.setInterval === "function") {
      activeCheckTimer = scope.setInterval(recheckActivePanel, ACTIVE_APPROVAL_POLL_MS);
    }
  };
  // Negative status permanently hides launchers until this document reloads.
  // It cannot cancel an already granted wallet prompt or signed transaction.
  const hideRevoked = () => {
    stopActiveApprovalChecks();
    ++openRequestId;
    panel.hidden = true;
    expanded(false);
    buttons.forEach(control => { control.hidden = true; });
    status.textContent = "Provider access has been paused. Refresh to check again. Existing wallet requests and submitted transactions are not cancelled.";
  };
  expanded(false);
  buttons.forEach(button => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      // Keep an already-mounted wallet widget concealed until a NEW
      // uncached approval check passes; never expose stale-tab controls.
      lastTrigger = button;
      if (loading) {
        status.textContent = "Provider is finishing a previous load. If the panel stays empty, click Swap again.";
        return;
      }
      const requestId = ++openRequestId;
      loading = true;
      buttons.forEach(control => { control.disabled = true; });
      status.textContent = "Checking current provider release approval. No wallet transaction has been requested by Climboria.";
      try {
        // Page-load approval may be revoked while this document stays open.
        const allowedOnOpen = await isManagedSwapRuntimeApproved(scope);
        if (requestId !== openRequestId) return;
        if (!allowedOnOpen) {
          hideRevoked();
          return;
        }
        panel.hidden = false;
        expanded(true);
        startActiveApprovalChecks();
        panel.scrollIntoView?.({ behavior: "smooth", block: "start" });
        if (mounted) {
          status.textContent = "Provider interface loaded. Wallet prompts and execution are handled by the provider. Check every transaction in your wallet.";
          return;
        }
        status.textContent = "Loading verified provider integration. No wallet transaction has been requested by Climboria.";
        if (!scriptLoaded) {
          await loadReviewedScript(doc, approved);
          scriptLoaded = true;
        }
        if (requestId !== openRequestId || panel.hidden) return;
        // Approval may also be revoked during the external script download.
        const allowedOnInit = await isManagedSwapRuntimeApproved(scope);
        if (requestId !== openRequestId || panel.hidden) return;
        if (!allowedOnInit) {
          hideRevoked();
          return;
        }
        if (!scope.Jupiter || typeof scope.Jupiter.init !== "function") {
          throw new Error("The reviewed provider did not expose the expected integration API");
        }
        await Promise.resolve(scope.Jupiter.init(integratedTerminalOptions(target.id)));
        mounted = true;
        if (requestId === openRequestId && !panel.hidden) {
          status.textContent = "Provider interface loaded. Wallet prompts and execution are handled by the provider. Check every transaction in your wallet.";
        }
      } catch {
        if (requestId === openRequestId && !panel.hidden) {
          status.textContent = "Provider integration unavailable. Review outstanding wallet prompts or activity before retrying. Climboria did not submit a swap.";
        }
      } finally {
        loading = false;
        buttons.forEach(control => { control.disabled = false; });
      }
    });
  });
  close.addEventListener("click", () => {
    stopActiveApprovalChecks();
    ++openRequestId;
    panel.hidden = true;
    expanded(false);
    lastTrigger?.focus?.();
    status.textContent = mounted
      ? "Provider panel hidden. Closing this page does not cancel wallet prompts or on-chain transactions."
      : "Provider panel closed. No swap was submitted by Climboria.";
  });
  // Background tabs may throttle even the 15-second interval for minutes.
  // On return, conceal any mounted provider BEFORE requesting a new no-store
  // approval. This is only an exposure guard: it cannot recall a wallet
  // prompt or a transaction already submitted by third-party software.
  const recheckOnTabReturn = async () => {
    if (!mounted || loading || panel.hidden || resumeCheckInFlight) return;
    resumeCheckInFlight = true;
    // Fence out an older active-interval response and any in-flight close.
    const requestId = ++openRequestId;
    stopActiveApprovalChecks();
    panel.hidden = true;
    expanded(false);
    status.textContent = "Rechecking provider release approval after returning to this tab. Existing wallet requests and submitted transactions are not cancelled.";
    try {
      const stillApproved = await isManagedSwapRuntimeApproved(scope);
      if (requestId !== openRequestId) return;
      if (!stillApproved) {
        hideRevoked();
        return;
      }
      panel.hidden = false;
      expanded(true);
      status.textContent = "Provider interface loaded. Wallet prompts and execution are handled by the provider. Check every transaction in your wallet.";
      startActiveApprovalChecks();
    } finally {
      resumeCheckInFlight = false;
    }
  };
  doc.addEventListener?.("visibilitychange", () =>
    doc.visibilityState === "visible" ? recheckOnTabReturn() : undefined);
  scope.addEventListener?.("focus", () => recheckOnTabReturn());
  scope.addEventListener?.("pageshow", event =>
    event?.persisted ? recheckOnTabReturn() : undefined);
  return { ready: true, reason: "approved-script-configured" };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const boot = async () => {
    const config = window.CLIMBORIA_SWAP_CONFIG?.managedProvider;
    const runtimeEnabled = validateManagedProviderConfig(config) &&
      await isManagedSwapRuntimeApproved(window);
    initializeManagedSwapHost({ doc: document, scope: window, config: runtimeEnabled ? config : null });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else boot();
}
