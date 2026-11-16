/* CLIMB Solana mint supply: verified same-origin snapshot first, manual live RPC fallback.
 * No wallet permissions, trading, allocation guesses or inferred circulating supply.
 */
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

  const officialMint = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
  const rpcEndpoint = 'https://api.mainnet-beta.solana.com';
  const snapshotPath = '/data/climb-supply.json'; // Same origin; GitHub Pages static file.
  // Pages does not necessarily rebuild after a GITHUB_TOKEN-authored commit.
  // A public read-only raw repository mirror exposes the latest published
  // validated snapshot without needing another Cloudflare Worker or browser RPC.
  const mirrorSnapshotUrl = 'https://raw.githubusercontent.com/CryptoDilis/Climboria/main/data/climb-supply.json';
  const maxRawSupply = 18446744073709551615n;
  const SNAPSHOT_MAX_AGE_MS = 4 * 60 * 60 * 1000;
  const DEADLINE_MS = 6500;
  const SNAPSHOT_DEADLINE_MS = 3500;
  const BACKGROUND_CHECK_INTERVAL_MS = 20 * 60 * 1000;
  const MIRROR_CHECK_AFTER_MS = 30 * 60 * 1000;

  function parseUnits(amount, decimals, slot) {
    if (!Number.isSafeInteger(slot) || slot <= 0 ||
        typeof amount !== 'string' || !/^(?:0|[1-9][0-9]{0,19})$/.test(amount) ||
        BigInt(amount) > maxRawSupply ||
        !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new Error('Invalid Solana mint supply fields');
    }
    const digits = amount.padStart(decimals + 1, '0');
    const boundary = decimals ? digits.length - decimals : digits.length;
    const integer = digits.slice(0, boundary).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fraction = decimals ? digits.slice(boundary).replace(/0+$/, '') : '';
    return {formatted: integer + (fraction ? '.' + fraction : ''), decimals, slot};
  }
  function parseSupply(data) {
    if (data?.jsonrpc !== '2.0' || data?.error || data?.id !== 'climb-supply') {
      throw new Error('Invalid RPC envelope');
    }
    return parseUnits(data?.result?.value?.amount, data?.result?.value?.decimals,
      data?.result?.context?.slot);
  }
  function parseStaticSnapshot(data) {
    if (data?.schema !== 1 || data?.status !== 'ready' || data?.mint !== officialMint ||
        data?.source !== 'solana-mainnet-finalized-rpc' ||
        data?.commitment !== 'finalized' ||
        typeof data.observedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.observedAt)) {
      throw new Error('No finalized static mint snapshot');
    }
    const observed = Date.parse(data.observedAt);
    const age = Date.now() - observed;
    if (!Number.isFinite(observed) || new Date(observed).toISOString() !== data.observedAt ||
        age < -60000 || age > SNAPSHOT_MAX_AGE_MS) {
      throw new Error('Static mint snapshot is stale or invalid');
    }
    return {...parseUnits(data.amount, data.decimals, data.slot), observedAt: data.observedAt};
  }
  async function withDeadline(work, delayMs) {
    const controller = new AbortController();
    let timeoutId;
    const request = work(controller.signal);
    const deadline = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timed out'));
      }, delayMs);
    });
    try { return await Promise.race([request, deadline]); }
    finally { clearTimeout(timeoutId); }
  }
  function setState(state, label) {
    stateEl.dataset.state = state;
    stateEl.textContent = label;
    panelEl.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }
  function unavailable(message) {
    valueEl.textContent = 'Unavailable';
    decimalsEl.textContent = '—';
    setState('unavailable', 'Supply unavailable');
    sourceEl.textContent = message;
    checkedEl.textContent = 'No current on-chain supply snapshot is available.';
    button.textContent = 'CHECK LIVE SOLANA ↗';
  }
  function showSnapshot(data, label, detail) {
    lastDisplayLabel = label;
    lastDisplayDetail = detail;
    valueEl.textContent = data.formatted;
    decimalsEl.textContent = String(data.decimals);
    setState('loaded', label);
    sourceEl.textContent = detail + ' · slot ' +
      data.slot.toLocaleString('en-US') + '. Not a circulating-supply audit.';
    checkedEl.textContent = 'Finalized snapshot observed at ' + new Date(data.observedAt).toLocaleString() +
      ' · Figures can change with mint activity.';
    button.textContent = 'RECHECK LIVE SOLANA ↗';
  }
  function officialMintMatches() {
    return addressEl.textContent.trim() === officialMint;
  }
  let busy = false;
  let lastRequest = 0;
  let lastVerified = null;
  let lastAutoCheckAt = 0;
  let lastDisplayLabel = '';
  let lastDisplayDetail = '';

  function isSnapshotFresh(snapshot) {
    if (!snapshot || typeof snapshot.observedAt !== 'string') return false;
    const observed = Date.parse(snapshot.observedAt);
    const age = Date.now() - observed;
    return Number.isFinite(observed) && age >= -60000 && age <= SNAPSHOT_MAX_AGE_MS;
  }

  function expireVisibleSnapshot() {
    if (lastVerified && !isSnapshotFresh(lastVerified)) {
      lastVerified = null;
      lastDisplayLabel = '';
      lastDisplayDetail = '';
      if (!busy) unavailable('The last finalized supply snapshot has expired. Reload the current record or check this mint on Solscan.');
    }
  }

  async function upgradeOlderPagesSnapshot(pagesSnapshot) {
    try {
      const mirror = await withDeadline(async signal => {
        const response = await fetch(mirrorSnapshotUrl, {
          method:'GET', signal, cache:'no-store', credentials:'omit', redirect:'error'
        });
        if (!response.ok) throw new Error('GitHub snapshot unavailable');
        return parseStaticSnapshot(await response.json());
      }, SNAPSHOT_DEADLINE_MS);
      // Only upgrade a still-displayed Pages snapshot. A manual live recheck,
      // newer background request or expired data must never be overwritten by
      // an older cross-origin response that arrives later.
      if (!busy && lastVerified === pagesSnapshot && isSnapshotFresh(mirror) &&
          mirror.slot > pagesSnapshot.slot &&
          Date.parse(mirror.observedAt) >= Date.parse(pagesSnapshot.observedAt)) {
        lastVerified = mirror;
        showSnapshot(mirror, 'Finalized RPC snapshot',
          'Newer GitHub repository finalized Solana snapshot');
      }
    } catch {
      // The public GitHub mirror is optional; a valid Pages snapshot remains
      // visible even when GitHub raw CORS/network access is unavailable.
    }
  }

  async function loadStaticSnapshot() {
    if (busy) return;
    if (!officialMintMatches()) {
      unavailable('Official mint mismatch. Check the CA listed above.');
      return;
    }
    busy = true;
    lastAutoCheckAt = Date.now();
    const prior = isSnapshotFresh(lastVerified) ? lastVerified : null;
    button.disabled = true;
    setState('loading', 'Checking verified snapshot');
    valueEl.textContent = 'Checking…';
    sourceEl.textContent = 'Reading the latest finalized supply snapshot published by Climboria.';
    try {
      let selected = null;
      // Prefer own-origin Pages JSON. If GitHub Pages is behind its source
      // branch, try the public main-branch file, which can be newer. In both
      // cases the EXACT SAME schema/CA/freshness validation is mandatory.
      for (const item of [
        {url: snapshotPath, label:'Same-origin finalized Solana snapshot'},
        {url: mirrorSnapshotUrl, label:'GitHub repository finalized Solana snapshot'}
      ]) {
        try {
          const snapshot = await withDeadline(async signal => {
            const response = await fetch(item.url, {
              method:'GET', signal, cache:'no-store', credentials:'omit', redirect:'error'
            });
            if (!response.ok) throw new Error('No current snapshot at this source');
            return parseStaticSnapshot(await response.json());
          }, SNAPSHOT_DEADLINE_MS);
          selected = {snapshot, label:item.label};
          break;
        } catch {
          // A stale/missing/cross-origin-blocked source never creates a supply
          // value; try the second source, then show an honest unavailable state.
        }
      }
      if (!selected) throw new Error('No usable snapshot source');
      const current = isSnapshotFresh(lastVerified) ? lastVerified : null;
      if (current && (current.slot > selected.snapshot.slot ||
          (current.slot === selected.snapshot.slot &&
           Date.parse(current.observedAt) > Date.parse(selected.snapshot.observedAt)))) {
        showSnapshot(current, lastDisplayLabel || 'Finalized RPC snapshot',
          lastDisplayDetail || 'Previously verified, newer finalized Solana snapshot');
      } else {
        lastVerified = selected.snapshot;
        showSnapshot(selected.snapshot, 'Finalized RPC snapshot', selected.label);
      }
      // Pages can lag a newer Actions-bot main-branch JSON commit yet remain
      // younger than four hours. Check GitHub raw in the background when Pages
      // is more than 30 minutes old; never hold up the initial render.
      if (selected.label === 'Same-origin finalized Solana snapshot' &&
          Date.now() - Date.parse(selected.snapshot.observedAt) > MIRROR_CHECK_AFTER_MS &&
          lastVerified === selected.snapshot) {
        // The request starts after the page has rendered its valid result.
        queueMicrotask(() => { void upgradeOlderPagesSnapshot(selected.snapshot); });
      }
    } catch {
      if (isSnapshotFresh(prior)) {
        lastVerified = prior;
        showSnapshot(prior, lastDisplayLabel || 'Last verified finalized snapshot',
          lastDisplayDetail || 'Retained valid finalized snapshot during refresh failure');
      } else {
        lastVerified = null;
        unavailable('No fresh finalized supply snapshot is reachable from Pages or GitHub. You can try the direct Solana lookup or check this exact mint on Solscan.');
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  async function loadSupply() {
    if (busy) return;
    if (!officialMintMatches()) {
      unavailable('Official mint mismatch. Check the CA listed above.');
      return;
    }
    if (Date.now() - lastRequest < 5000) return;
    lastRequest = Date.now();
    busy = true;
    button.disabled = true;
    const preserveVerified = isSnapshotFresh(lastVerified);
    button.textContent = 'CHECKING…';
    setState('loading', 'Checking live Solana RPC');
    if (!preserveVerified) {
      valueEl.textContent = 'Checking…';
      decimalsEl.textContent = '—';
    }
    sourceEl.textContent = 'Checking finalized Solana data. This lookup will stop after 7 seconds.';
    try {
      const data = await withDeadline(async signal => {
        const response = await fetch(rpcEndpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0', id: 'climb-supply', method: 'getTokenSupply',
            params: [officialMint, {commitment: 'finalized'}]
          }),
          signal,
          cache: 'no-store',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error('RPC request failed');
        return parseSupply(await response.json());
      }, DEADLINE_MS);
      lastVerified = {...data, observedAt: new Date().toISOString()};
      showSnapshot(lastVerified, 'Live RPC snapshot', 'Solana mainnet finalized RPC snapshot');
    } catch {
      if (preserveVerified && lastVerified) {
        showSnapshot(lastVerified, 'Cached snapshot · live RPC unavailable',
          'Live RPC request blocked; showing last valid finalized supply snapshot');
        button.textContent = 'RETRY LIVE SOLANA ↗';
      } else {
        unavailable('Public Solana RPC did not return a usable finalized snapshot. Browser CORS, rate limits or timeout may block it; check the mint on Solscan.');
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  }
  button.addEventListener('click', loadSupply);
  // A long-open dashboard must not continue to present an expired supply
  // number as current. Refresh periodically while visible and re-check when
  // returning to the tab, always read-only and without wallet interaction.
  const checkVisibleSnapshot = () => {
    expireVisibleSnapshot();
    if (document.visibilityState === 'visible' && !busy &&
        Date.now() - lastAutoCheckAt >= BACKGROUND_CHECK_INTERVAL_MS) {
      void loadStaticSnapshot();
    }
  };
  document.addEventListener('visibilitychange', checkVisibleSnapshot);
  window.setInterval(checkVisibleSnapshot, 60 * 1000);
  // Same-origin JSON remains the initial cheap, no-CORS source.
  void loadStaticSnapshot();
})();
