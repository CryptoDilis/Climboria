/**
 * Base (chain 8453) contract-first market discovery on Climboria Swap.
 * Read-only, provider-reported DexScreener pool observations. NOT a swap quote,
 * router, wallet connection, token verification or a transaction approval.
 */
export const BASE_CHAIN_ID = 8453;
export const BASE_MARKET_ENDPOINT = "https://api.dexscreener.com/latest/dex/tokens/";
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const MAX_PAIRS = 8;
const MAX_RESPONSE_CHARS = 450000;

export function canonicalBaseAddress(value) {
  return typeof value === "string" && ADDRESS_RE.test(value.trim())
    ? value.trim().toLowerCase() : null;
}

function metric(value, { positive = false } = {}) {
  if ((typeof value !== "number" && (typeof value !== "string" || !value.trim() || value.length > 50)))
    return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (positive && number <= 0)) return null;
  return number;
}

/**
 * A DexScreener USD price is for pair.baseToken, NEVER pair.quoteToken.
 * Match the exact user-supplied EVM contract on the Base chain (not the symbol).
 */
export function parseBaseMarketPairs(payload, contract) {
  const address = canonicalBaseAddress(contract);
  if (!address || !Array.isArray(payload?.pairs)) return [];
  const byPair = new Map();
  for (const pair of payload.pairs.slice(0, 150)) {
    if (!pair || pair.chainId !== "base") continue;
    const pairAddress = canonicalBaseAddress(pair.pairAddress);
    const baseAddress = canonicalBaseAddress(pair.baseToken?.address);
    const quoteAddress = canonicalBaseAddress(pair.quoteToken?.address);
    if (!pairAddress || (baseAddress !== address && quoteAddress !== address)) continue;
    const liquidity = metric(pair.liquidity?.usd, { positive: true });
    if (liquidity === null) continue; // No credible pool liquidity for this discovery card.
    const isBaseAsset = baseAddress === address;
    const rawSymbol = isBaseAsset ? pair.baseToken?.symbol : pair.quoteToken?.symbol;
    const symbol = typeof rawSymbol === "string" ? rawSymbol.slice(0, 24) : "Unknown";
    const quoteSymbol = typeof (isBaseAsset ? pair.quoteToken?.symbol : pair.baseToken?.symbol) === "string"
      ? (isBaseAsset ? pair.quoteToken.symbol : pair.baseToken.symbol).slice(0, 24) : "Unknown";
    const priceUsd = isBaseAsset ? metric(pair.priceUsd, { positive: true }) : null;
    const volume24hUsd = metric(pair.volume?.h24);
    const change24h = isBaseAsset ? metricSigned(pair.priceChange?.h24) : null;
    const item = {
      contract: address, pairAddress, symbol, quoteSymbol,
      venue: typeof pair.dexId === "string" ? pair.dexId.slice(0, 32) : "Unknown",
      priceUsd, volume24hUsd, liquidityUsd: liquidity, change24h,
      priceAvailable: isBaseAsset && priceUsd !== null
    };
    const previous = byPair.get(pairAddress);
    if (!previous || item.liquidityUsd > previous.liquidityUsd) byPair.set(pairAddress, item);
  }
  return [...byPair.values()]
    .sort((a,b) => b.liquidityUsd-a.liquidityUsd || a.pairAddress.localeCompare(b.pairAddress))
    .slice(0,MAX_PAIRS);
}
function metricSigned(value) {
  if ((typeof value !== "number" && (typeof value !== "string" || !value.trim() || value.length > 50)))
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function baseMarketUrl(contract) {
  const value = canonicalBaseAddress(contract);
  return value ? BASE_MARKET_ENDPOINT + value : null;
}

const usd = value => value === null
  ? "—" : new Intl.NumberFormat("en-US", {
      style:"currency", currency:"USD", maximumFractionDigits:value < 1 ? 8 : 2
    }).format(value);

export function initializeBaseMarketPreview({ doc = document, scope = window, fetchImpl = scope.fetch?.bind(scope) } = {}) {
  const panel = doc.getElementById("baseMarketPanel");
  const form = doc.getElementById("baseMarketForm");
  const input = doc.getElementById("baseMarketContract");
  const status = doc.getElementById("baseMarketStatus");
  const results = doc.getElementById("baseMarketResults");
  if (!panel || !form || !input || !status || !results || typeof fetchImpl !== "function") return { ready:false };
  let sequence = 0, activeController = null;
  const baseSelected = () => doc.documentElement?.dataset?.climboriaSwapNetwork === "base";
  const reset = (message) => {
    ++sequence;
    if (activeController) activeController.abort();
    activeController = null;
    results.replaceChildren();
    status.textContent = message;
  };
  const sync = () => {
    const onBase = baseSelected();
    panel.hidden = !onBase;
    if (!onBase) reset("Select Base to inspect ERC-20 pool data.");
    else if (!results.childElementCount) status.textContent =
      "Enter an exact Base ERC-20 contract address (0x + 40 hex characters).";
  };
  const render = (pairs, contract) => {
    results.replaceChildren();
    const heading = doc.createElement("p");
    heading.className = "base-market-proof";
    heading.textContent = "Chain: Base (8453) · Exact contract match: " + contract + " · Market data only";
    results.appendChild(heading);
    for (const pair of pairs) {
      const card = doc.createElement("article");
      card.className = "base-market-pair";
      const name = doc.createElement("h4");
      name.textContent = pair.symbol + " / " + pair.quoteSymbol + " · " + pair.venue;
      card.appendChild(name);
      const address = doc.createElement("p");
      address.className = "base-market-contract";
      address.textContent = "Pool: " + pair.pairAddress;
      card.appendChild(address);
      const numbers = doc.createElement("p");
      numbers.className = "base-market-metrics";
      numbers.textContent = "Contract token USD price: " + usd(pair.priceUsd) +
        " · Pool liquidity: " + usd(pair.liquidityUsd) +
        " · 24h volume: " + usd(pair.volume24hUsd) +
        (pair.change24h === null ? "" : " · 24h change: " + pair.change24h.toFixed(2) + "%");
      card.appendChild(numbers);
      if (!pair.priceAvailable) {
        const note = doc.createElement("p");
        note.className = "base-market-note";
        note.textContent = "Selected contract is the pool quote asset or has no reported price. The displayed USD price is unavailable; we will not show the other token's price.";
        card.appendChild(note);
      }
      const link = doc.createElement("a");
      link.href = "https://dexscreener.com/base/" + pair.pairAddress;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.referrerPolicy = "no-referrer";
      link.textContent = "Inspect this Base pool on DexScreener";
      card.appendChild(link);
      results.appendChild(card);
    }
    const explorer = doc.createElement("a");
    explorer.href = "https://basescan.org/token/" + contract;
    explorer.target = "_blank";
    explorer.rel = "noopener noreferrer";
    explorer.referrerPolicy = "no-referrer";
    explorer.textContent = "Inspect the exact ERC-20 contract on BaseScan";
    results.appendChild(explorer);
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!baseSelected()) { reset("Base is not selected. No Base request sent."); return; }
    const contract = canonicalBaseAddress(input.value);
    reset("Checking live Base pool market data…");
    if (!contract) {
      status.textContent = "Enter the exact 0x-prefixed 40-hex Base ERC-20 address. Symbols are not unique.";
      return;
    }
    const request = sequence;
    const controller = new AbortController();
    activeController = controller;
    const timeout = scope.setTimeout?.(() => controller.abort(), 10000);
    try {
      const response = await fetchImpl(baseMarketUrl(contract), {
        method:"GET", cache:"no-store", headers:{ accept:"application/json" },
        signal:controller.signal
      });
      if (!response.ok) throw new Error("Market data provider HTTP " + response.status);
      const declared = Number(response.headers?.get("content-length") || 0);
      if (declared > MAX_RESPONSE_CHARS) throw new Error("Market data response too large");
      const raw = await response.text();
      if (raw.length > MAX_RESPONSE_CHARS) throw new Error("Market data response too large");
      const parsed = JSON.parse(raw);
      if (request !== sequence || !baseSelected() || canonicalBaseAddress(input.value) !== contract) return;
      const pairs = parseBaseMarketPairs(parsed, contract);
      if (!pairs.length) {
        status.textContent = "No Base pools with matching contract and positive reported liquidity. No price was inferred.";
        return;
      }
      render(pairs, contract);
      status.textContent = "Found " + pairs.length + " Base pool(s). These are third-party market observations, NOT executable quotes, approved assets or wallet transactions.";
    } catch (error) {
      if (request === sequence && baseSelected()) {
        results.replaceChildren();
        status.textContent = "Base market lookup unavailable. No quote or transaction prepared.";
      }
    } finally {
      if (timeout !== undefined) scope.clearTimeout?.(timeout);
      if (request === sequence) activeController = null;
    }
  });
  doc.getElementById("chainBase")?.addEventListener("click", sync);
  doc.getElementById("chainSolana")?.addEventListener("click", sync);
  scope.addEventListener?.("popstate", () => scope.setTimeout?.(sync, 0));
  sync();
  return { ready:true, sync };
}
if (typeof document !== "undefined" && typeof window !== "undefined") {
  initializeBaseMarketPreview();
}
