/**
 * Optional, provider-managed, in-page Solana swap surface.
 * This module NEVER calls Climboria's /api/swap/order or /api/swap/execute,
 * signs a transaction, requests wallet keys or claims a completed trade.
 * The official provider must be verified separately before enabling.
 */
const OFFICIAL_TERMINAL_HOST = "terminal.jup.ag";
const SCRIPT_PATH = /^\/main-v[1-9][0-9]*\.js$/;
const SHA384_SRI = /^sha384-[A-Za-z0-9+/]{64}$/;

export function validateManagedProviderConfig(config) {
  if (!config || config.enabled !== true || config.runtimeApproved !== true || config.provider !== "jupiter-terminal" ||
      typeof config.scriptUrl !== "string" || typeof config.integrity !== "string" ||
      !SHA384_SRI.test(config.integrity)) return null;
  try {
    const url = new URL(config.scriptUrl);
    if (url.protocol !== "https:" || url.hostname !== OFFICIAL_TERMINAL_HOST ||
        url.port || url.username || url.password || url.search || url.hash ||
        !SCRIPT_PATH.test(url.pathname)) return null;
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
  expanded(false);
  buttons.forEach(button => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      panel.hidden = false;
      lastTrigger = button;
      expanded(true);
      panel.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (mounted) return;
      if (loading) {
        status.textContent = "Provider is finishing a previous load. If the panel stays empty, click Swap again.";
        return;
      }
      const requestId = ++openRequestId;
      loading = true;
      buttons.forEach(control => { control.disabled = true; });
      status.textContent = "Loading verified provider integration. No wallet transaction has been requested by Climboria.";
      try {
        if (!scriptLoaded) {
          await loadReviewedScript(doc, approved);
          scriptLoaded = true;
        }
        if (requestId !== openRequestId || panel.hidden) return;
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
    ++openRequestId;
    panel.hidden = true;
    expanded(false);
    lastTrigger?.focus?.();
    status.textContent = mounted
      ? "Provider panel hidden. Closing this page does not cancel wallet prompts or on-chain transactions."
      : "Provider panel closed. No swap was submitted by Climboria.";
  });
  return { ready: true, reason: "approved-script-configured" };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const boot = async () => {
    const config = window.CLIMBORIA_SWAP_CONFIG?.managedProvider;
    let runtimeEnabled = false;
    if (validateManagedProviderConfig(config)) {
      try {
        const response = await window.fetch("/swap-runtime-status.json", {
          cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000)
        });
        const cachePolicy = response.headers.get("Cache-Control") ?? "";
        runtimeEnabled = response.ok && /(?:^|,)\s*no-store\s*(?:,|$)/i.test(cachePolicy) &&
          (await response.json())?.enabled === true;
      } catch {
        // A missing or unavailable release status keeps the provider disabled.
      }
    }
    initializeManagedSwapHost({ doc: document, scope: window, config: runtimeEnabled ? config : null });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else boot();
}
