/* Read-only $CLIMB mint supply lookup. No wallet operations and no inferred circulating supply. */
(() => {
  'use strict';
  const button = document.getElementById('climbSupplyRefresh');
  const valueEl = document.getElementById('climbSupplyValue');
  const decimalsEl = document.getElementById('climbSupplyDecimals');
  const sourceEl = document.getElementById('climbSupplySource');
  const addressEl = document.getElementById('climbOfficialCa');
  const stateEl = document.getElementById('climbSupplyState');
  const checkedEl = document.getElementById('climbSupplyChecked');
  const panelEl = document.getElementById('climbSupplyPanel');
  if (!button || !valueEl || !decimalsEl || !sourceEl || !addressEl ||
      !stateEl || !checkedEl || !panelEl) return;

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

  const DEADLINE_MS = 6500;
  let busy = false;
  let lastRequest = 0;

  function setState(state, label) {
    stateEl.dataset.state = state;
    stateEl.textContent = label;
    panelEl.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }
  function unavailable(message) {
    valueEl.textContent = 'Unavailable';
    decimalsEl.textContent = '—';
    setState('unavailable', 'RPC unavailable');
    sourceEl.textContent = message;
    checkedEl.textContent = 'No current on-chain supply snapshot is available.';
    button.textContent = 'TRY AGAIN ↗';
  }
  async function loadSupply() {
    if (busy) return;
    if (addressEl.textContent.trim() !== officialMint) {
      unavailable('The displayed mint does not match the official project announcement.');
      return;
    }
    if (Date.now() - lastRequest < 5000) return;
    lastRequest = Date.now();
    busy = true;
    button.disabled = true;
    button.textContent = 'CHECKING…';
    setState('loading', 'Request in progress');
    valueEl.textContent = 'Checking…';
    decimalsEl.textContent = '—';
    sourceEl.textContent = 'Checking finalized Solana data. This lookup will stop after 7 seconds.';
    checkedEl.textContent = 'Waiting for a finalized RPC response…';

    // AbortController alone cannot guarantee a visible response if a browser
    // stalls before dispatch. Race the entire fetch + JSON processing against
    // a fixed deadline. Late responses cannot overwrite a newer UI state.
    const controller = new AbortController();
    let timeoutId;
    try {
      const request = (async () => {
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
        if (!response.ok) throw new Error('RPC request failed');
        return parseSupply(await response.json());
      })();
      const deadline = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('Request timed out'));
        }, DEADLINE_MS);
      });
      const data = await Promise.race([request, deadline]);
      valueEl.textContent = data.formatted;
      decimalsEl.textContent = String(data.decimals);
      setState('loaded', 'RPC snapshot loaded');
      sourceEl.textContent = 'Solana mainnet finalized RPC snapshot · slot ' +
        data.slot.toLocaleString('en-US') + '. Not a circulating-supply audit.';
      checkedEl.textContent = 'Browser checked at ' + new Date().toLocaleString() +
        ' · Snapshot may change with mint activity.';
      button.textContent = 'REFRESH SUPPLY ↗';
    } catch {
      unavailable('Public Solana RPC did not return a usable finalized snapshot. Browser CORS, rate limits or timeout may block it; check the mint on Solscan.');
    } finally {
      clearTimeout(timeoutId);
      busy = false;
      button.disabled = false;
    }
  }
  button.addEventListener('click', loadSupply);
})();
