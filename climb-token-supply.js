/* Read-only $CLIMB mint supply lookup. No wallet operations and no inferred circulating supply. */
(() => {
  'use strict';
  const button = document.getElementById('climbSupplyRefresh');
  const valueEl = document.getElementById('climbSupplyValue');
  const decimalsEl = document.getElementById('climbSupplyDecimals');
  const sourceEl = document.getElementById('climbSupplySource');
  const addressEl = document.getElementById('climbOfficialCa');
  if (!button || !valueEl || !decimalsEl || !sourceEl || !addressEl) return;

  // The query is always tied to the exact owner-announced mint displayed on the
  // page; never take a wallet, URL query, or user-provided arbitrary mint.
  const officialMint = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
  const rpcEndpoint = 'https://api.mainnet-beta.solana.com';
  const maxRawSupply = 18446744073709551615n; // Token amounts are u64.

  function parseSupply(data) {
    if (data?.jsonrpc !== '2.0' || data?.error || data?.id !== 'climb-supply') {
      throw new Error('Invalid RPC envelope');
    }
    const slot = data?.result?.context?.slot;
    const amount = data?.result?.value?.amount;
    const decimals = data?.result?.value?.decimals;
    if (!Number.isSafeInteger(slot) || slot <= 0 ||
        typeof amount !== 'string' || !/^(?:0|[1-9][0-9]{0,19})$/.test(amount) ||
        BigInt(amount) > maxRawSupply ||
        !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new Error('Invalid Solana mint supply fields');
    }
    // Format from the raw u64 amount and decimal scale without floating-point
    // rounding; uiAmount may lose precision for large token supplies.
    const digits = amount.padStart(decimals + 1, '0');
    const boundary = decimals ? digits.length - decimals : digits.length;
    const integer = digits.slice(0, boundary).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fraction = decimals ? digits.slice(boundary).replace(/0+$/, '') : '';
    return { formatted: integer + (fraction ? '.' + fraction : ''), decimals, slot };
  }

  let busy = false;
  let lastRequest = 0;
  async function loadSupply() {
    if (busy) return;
    if (addressEl.textContent.trim() !== officialMint) {
      valueEl.textContent = 'Unavailable';
      sourceEl.textContent = 'Official mint mismatch. No supply data displayed.';
      decimalsEl.textContent = '—';
      return;
    }
    // Avoid rapid repeated calls against a public shared Solana RPC endpoint.
    if (Date.now() - lastRequest < 5000) return;
    lastRequest = Date.now();
    busy = true;
    button.disabled = true;
    valueEl.textContent = 'Checking…';
    decimalsEl.textContent = '—';
    sourceEl.textContent = 'Reading finalized mint supply from Solana mainnet…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0', id: 'climb-supply', method: 'getTokenSupply',
          params: [officialMint, {commitment: 'finalized'}]
        }),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit'
      });
      if (!response.ok) throw new Error('RPC response unavailable');
      const data = parseSupply(await response.json());
      valueEl.textContent = data.formatted;
      decimalsEl.textContent = String(data.decimals);
      sourceEl.textContent = 'Solana mainnet finalized RPC snapshot · slot ' +
        data.slot.toLocaleString('en-US') + '. Not a circulating-supply audit.';
      button.textContent = 'REFRESH SUPPLY ↗';
    } catch {
      valueEl.textContent = 'Unavailable';
      decimalsEl.textContent = '—';
      sourceEl.textContent = 'Supply could not be retrieved from public Solana RPC. Verify the mint in Solscan; no estimate is shown.';
      button.textContent = 'TRY AGAIN ↗';
    } finally {
      clearTimeout(timeout);
      busy = false;
      button.disabled = false;
    }
  }
  button.addEventListener('click', loadSupply);
})();
