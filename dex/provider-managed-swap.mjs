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
// Choose exactly one operator-controlled status service per release, never an
// OR/fallback that could authorize a widget after a failed/revoked status.
const RUNTIME_STATUS_URLS = new Set([
  "/swap-runtime-status.json",
  "https://api.climboria.fun/api/swap/provider-status"
]);

export function validateManagedProviderConfig(config) {
  if (!config || config.enabled !== true || config.runtimeApproved !== true || config.provider !== "jupiter-terminal" ||
      typeof config.scriptUrl !== "string" || typeof config.integrity !== "string" ||
      !SHA384_SRI.test(config.integrity) ||
      !RUNTIME_STATUS_URLS.has(config.runtimeStatusUrl ?? "/swap-runtime-status.json")) return null;
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

/** A release for Swap must never implicitly unlock DEX, or vice versa. */
export function isManagedProviderSurfaceApproved(config, surface) {
  return (surface === "swap" || surface === "dex") && config?.surfaces?.[surface] === true;
}

const SOLANA_BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Reject malformed and non-32-byte Solana mint addresses without trusting UI labels. */
export function isCanonicalSolanaMint(mint) {
  if (typeof mint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) return false;
  let number = 0n;
  for (const ch of mint) {
    const digit = SOLANA_BASE58.indexOf(ch);
    if (digit < 0) return false;
    number = number * 58n + BigInt(digit);
  }
  let byteLength = 0;
  while (number > 0n) { ++byteLength; number >>= 8n; }
  return byteLength + (mint.match(/^1*/)?.[0].length ?? 0) === 32;
}

function readSelectedProviderPair(panel) {
  const inputMint = panel.getAttribute?.("data-climboria-managed-swap-input-mint") ?? null;
  const outputMint = panel.getAttribute?.("data-climboria-managed-swap-output-mint") ?? null;
  if (inputMint === null && outputMint === null) return null;
  return { inputMint, outputMint };
}

/**
 * The official Plugin supports initialInputMint/initialOutputMint as *hints*.
 * Never pass stale Climboria quote amounts, fees, or its wallet context.
 * Jupiter must independently quote and present wallet consent.
 */
export function integratedTerminalOptions(targetId, pair = null) {
  if (typeof targetId !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(targetId)) {
    throw new Error("A safe integrated Jupiter target ID is required");
  }
  const base = { displayMode: "integrated", integratedTargetId: targetId };
  if (pair === null) return Object.freeze(base);
  if (!pair || !isCanonicalSolanaMint(pair.inputMint) ||
      !isCanonicalSolanaMint(pair.outputMint) || pair.inputMint === pair.outputMint) {
    throw new Error("Invalid or incomplete Jupiter input/output mint selection");
  }
  return Object.freeze({
    ...base,
    formProps: Object.freeze({
      initialInputMint: pair.inputMint,
      initialOutputMint: pair.outputMint
    })
  });
}

/**
 * A previously approved page must not bypass a later production rollback.
 * Recheck before every widget open and immediately before provider init.
 */
export async function isManagedSwapRuntimeApproved(scope, statusUrl = "/swap-runtime-status.json") {
  if (!scope || typeof scope.fetch !== "function" || !RUNTIME_STATUS_URLS.has(statusUrl)) return false;
  try {
    const response = await scope.fetch(statusUrl, {
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
  const surface = panel.getAttribute?.("data-climboria-managed-swap-surface");
  const approved = isManagedProviderSurfaceApproved(config, surface)
    ? validateManagedProviderConfig(config) : null;
  const runtimeStatusUrl = config?.runtimeStatusUrl ?? "/swap-runtime-status.json";
  if (!approved || !target || !target.id || !status || !close || !buttons.length) {
    buttons.forEach(button => { button.hidden = true; });
    panel.hidden = true;
    return { ready: false, reason: "provider-not-approved" };
  }
  let loading = false;
  let mounted = false;
  let mountedPair = null;
  // Vendor init can asynchronously create its own root before resolving.
  // Close/revoke must conceal that partial UI as well as mounted instances.
  let providerInitInFlight = false;
  // Jupiter.close() hides the vendor-owned root as well as our panel.
  // A fresh, explicitly approved reopen must invoke the official resume().
  let providerConcealedByClose = false;
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
      const stillApproved = await isManagedSwapRuntimeApproved(scope, runtimeStatusUrl);
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
    // The official Jupiter.close() only hides its own mounted instance;
    // it does not cancel an external wallet popup or any signed transaction.
    // Invoke it best-effort to conceal provider-owned overlays in addition
    // to our enclosing panel, and never let vendor errors reopen the UI.
    if ((mounted || providerInitInFlight) && typeof scope.Jupiter?.close === "function") {
      try { scope.Jupiter.close(); } catch { /* first-party panel is already hidden */ }
    }
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
        // Reject a forged or half-updated market selection before making any
        // provider request or fetching third-party executable code.
        const selectedPair = readSelectedProviderPair(panel);
        if (surface === "swap" &&
            panel.getAttribute?.("data-climboria-managed-swap-network") !== "solana") {
          throw new Error("Jupiter Plugin is unavailable on Base");
        }
        integratedTerminalOptions(target.id, selectedPair);
        // Page-load approval may be revoked while this document stays open.
        const allowedOnOpen = await isManagedSwapRuntimeApproved(scope, runtimeStatusUrl);
        if (requestId !== openRequestId) return;
        if (!allowedOnOpen) {
          hideRevoked();
          return;
        }
        // A mounted third-party widget owns its *original* pair. Initial mints
        // are hints passed only to Jupiter.init(), not a live reconfiguration.
        // Never reopen the old wallet interface after the user changes a
        // Solana token or direction (or clears the pair for Limit/invalid mint).
        // Check BEFORE revealing either the first-party or vendor-owned UI.
        if (mounted) {
          const currentPair = readSelectedProviderPair(panel);
          const samePair = (currentPair === null && mountedPair === null) ||
            (currentPair !== null && mountedPair !== null &&
             currentPair.inputMint === mountedPair.inputMint &&
             currentPair.outputMint === mountedPair.outputMint);
          if (!samePair) {
            hideRevoked();
            status.textContent = "Selected token or trade direction changed. The previous Jupiter widget was closed to avoid trading an outdated pair. Refresh the page, select the intended mints, and open a new provider session. Existing wallet prompts or submitted transactions cannot be cancelled.";
            return;
          }
        }
        panel.hidden = false;
        expanded(true);
        startActiveApprovalChecks();
        panel.scrollIntoView?.({ behavior: "smooth", block: "start" });
        if (mounted) {
          if (providerConcealedByClose) {
            // The official Plugin uses display:none on its own root when
            // close() is called. Reopening the host alone would leave an
            // invisible wallet widget unless resume() succeeds.
            try {
              if (typeof scope.Jupiter?.resume !== "function") {
                throw new Error("Jupiter.resume is unavailable");
              }
              scope.Jupiter.resume();
              providerConcealedByClose = false;
            } catch {
              // Never claim a working wallet UI when vendor resume failed.
              try { scope.Jupiter?.close?.(); } catch { /* best effort */ }
              stopActiveApprovalChecks();
              panel.hidden = true;
              expanded(false);
              status.textContent = "Provider could not be reopened safely. Refresh the page to retry; existing wallet requests or transactions are not cancelled.";
              return;
            }
          }
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
        const allowedOnInit = await isManagedSwapRuntimeApproved(scope, runtimeStatusUrl);
        if (requestId !== openRequestId || panel.hidden) return;
        if (!allowedOnInit) {
          hideRevoked();
          return;
        }
        if (!scope.Jupiter || typeof scope.Jupiter.init !== "function") {
          throw new Error("The reviewed provider did not expose the expected integration API");
        }
        // Read the currently verified DEX pair only at the user-triggered
        // initialization boundary. A partial or invalid pair fails closed.
        // Revalidate after async script/runtime checks: the selected token
        // may have changed while the browser was fetching the Plugin.
        const selection = readSelectedProviderPair(panel);
        if (surface === "swap" &&
            panel.getAttribute?.("data-climboria-managed-swap-network") !== "solana") {
          throw new Error("Jupiter Plugin is unavailable on Base");
        }
        const options = integratedTerminalOptions(target.id, selection);
        // A close/revoke during the vendor's asynchronous init must hide any
        // partially mounted provider root immediately, not only on resolution.
        providerInitInFlight = true;
        await Promise.resolve(scope.Jupiter.init(options));
        providerInitInFlight = false;
        // Late vendor init may finish after close/revoke. Hide its own overlay,
        // not only the first-party panel. This cannot cancel wallet prompts.
        if (requestId !== openRequestId || panel.hidden) {
          try { scope.Jupiter.close?.(); } catch { /* fail closed */ }
          return;
        }
        mountedPair = selection;
        mounted = true;
        providerConcealedByClose = false;
        if (requestId === openRequestId && !panel.hidden) {
          status.textContent = "Provider interface loaded. Wallet prompts and execution are handled by the provider. Check every transaction in your wallet.";
        }
      } catch (error) {
        const failedProviderInit = providerInitInFlight;
        providerInitInFlight = false;
        if (failedProviderInit) {
          // The vendor may have built an overlay before rejecting init.
          // Keep the first-party surface closed, even if close() throws.
          try { scope.Jupiter?.close?.(); } catch { /* best effort */ }
          panel.hidden = true;
          expanded(false);
          stopActiveApprovalChecks();
          // A partially mounted provider instance may be in an unknown state.
          // Require a new page load instead of retrying the same instance.
          buttons.forEach(control => { control.hidden = true; });
        }
        if (requestId === openRequestId) {
          if (failedProviderInit) {
            status.textContent = "Provider initialization failed and its interface was hidden. Refresh before retrying. Existing wallet requests or submitted transactions are not cancelled.";
          } else if (error?.message === "Invalid or incomplete Jupiter input/output mint selection") {
            // Invalid market hints are rejected before any provider script loads.
            // Reveal only an explanatory first-party panel, never the wallet UI.
            panel.hidden = false;
            expanded(true);
            status.textContent = "Selected token pair is invalid or incomplete. Verify the token mint and select Buy or Sell again; no Jupiter wallet request was made.";
          } else if (error?.message === "Jupiter Plugin is unavailable on Base") {
            // Solana provider never loads for a Base-selected user.
            panel.hidden = false;
            expanded(true);
            status.textContent = "Jupiter Plugin supports Solana swaps only. Return to the Solana tab; no wallet request was made.";
          } else if (!panel.hidden) {
            status.textContent = "Provider integration unavailable. Review outstanding wallet prompts or activity before retrying. Climboria did not submit a swap.";
          }
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
    // Closing the host must also hide the official Plugin-owned widget.
    // It cannot cancel separate wallet confirmations or submitted swaps.
    if ((mounted || providerInitInFlight) && typeof scope.Jupiter?.close === "function") {
      try {
        scope.Jupiter.close();
        if (mounted) providerConcealedByClose = true;
      } catch { /* first-party panel is already hidden */ }
    }
    lastTrigger?.focus?.();
    status.textContent = (mounted || providerInitInFlight)
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
    // A first-party hidden panel may not conceal a vendor-owned overlay.
    // Hide Jupiter's *own* root synchronously, before awaiting status.
    // The official close()/resume() pair only controls the widget display:
    // neither can cancel an existing wallet prompt or blockchain transaction.
    try {
      if (typeof scope.Jupiter?.close !== "function" ||
          typeof scope.Jupiter?.resume !== "function") {
        throw new Error("Jupiter close/resume is unavailable");
      }
      scope.Jupiter.close();
      providerConcealedByClose = true;
    } catch {
      hideRevoked();
      status.textContent = "Provider could not be safely concealed. Refresh before retrying. Existing wallet requests and submitted transactions are not cancelled.";
      resumeCheckInFlight = false;
      return;
    }
    status.textContent = "Rechecking provider release approval after returning to this tab. Existing wallet requests and submitted transactions are not cancelled.";
    try {
      const stillApproved = await isManagedSwapRuntimeApproved(scope, runtimeStatusUrl);
      if (requestId !== openRequestId) return;
      if (!stillApproved) {
        hideRevoked();
        return;
      }
      // Do not expose Jupiter-owned UI unless approval is still current.
      // The call is synchronous in the official Jupiter Plugin library.
      try {
        scope.Jupiter.resume();
        providerConcealedByClose = false;
      } catch {
        hideRevoked();
        status.textContent = "Provider could not be safely resumed. Refresh before retrying. Existing wallet requests and submitted transactions are not cancelled.";
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
    const surface = document.querySelector("[data-climboria-managed-swap-panel]")
      ?.getAttribute("data-climboria-managed-swap-surface");
    const runtimeEnabled = isManagedProviderSurfaceApproved(config, surface) &&
      validateManagedProviderConfig(config) &&
      await isManagedSwapRuntimeApproved(window, config?.runtimeStatusUrl ?? "/swap-runtime-status.json");
    initializeManagedSwapHost({ doc: document, scope: window, config: runtimeEnabled ? config : null });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else boot();
}
