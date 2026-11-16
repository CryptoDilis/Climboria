// Fetches a verified same-origin static CLIMB mint-supply snapshot for GitHub Pages.
// This code runs only in a GitHub Actions server-side job, never in a browser.
// A failed or malformed RPC response MUST NOT overwrite the last valid snapshot.
import {mkdir, writeFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseRpcSupply, MINT} from './index.mjs';

const FILE = 'data/climb-supply.json';
const DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';

function validRpcUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || raw.length < 10) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && Boolean(u.hostname) &&
      !u.username && !u.password && !u.hash;
  } catch { return false; }
}

export async function fetchVerifiedSnapshot({
  rpcUrl = DEFAULT_RPC_URL, fetchImpl = fetch, now = Date.now(), timeoutMs = 8000
} = {}) {
  if (!validRpcUrl(rpcUrl) || !Number.isFinite(now) || !Number.isSafeInteger(now)) {
    throw new Error('Invalid supply fetch configuration');
  }
  const controller = new AbortController();
  let timer;
  try {
    const work = (async () => {
      const response = await fetchImpl(rpcUrl, {
        method: 'POST', redirect: 'error',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0', id: 'climb-supply', method: 'getTokenSupply',
          params: [MINT, {commitment: 'finalized'}]
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('RPC response unavailable');
      const length = Number(response.headers.get('content-length') || 0);
      if (length > 8192) throw new Error('RPC response too large');
      const payload = await response.text();
      if (payload.length > 8192) throw new Error('RPC response too large');
      return parseRpcSupply(JSON.parse(payload), new Date(now).toISOString());
    })();
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('RPC deadline reached'));
      }, timeoutMs);
    });
    const snapshot = await Promise.race([work, deadline]);
    return {status: 'ready', ...snapshot};
  } finally {
    clearTimeout(timer);
  }
}

export async function writeSnapshot(snapshot, file = FILE) {
  // Reuse strict validation for every output, including timestamp freshness
  // relative to the request. Do not write stale or invented metadata.
  if (snapshot?.status !== 'ready' || snapshot?.mint !== MINT ||
      snapshot?.source !== 'solana-mainnet-finalized-rpc' ||
      snapshot?.commitment !== 'finalized' ||
      typeof snapshot.observedAt !== 'string') {
    throw new Error('Refusing unverified snapshot output');
  }
  const {parseCachedSnapshot} = await import('./index.mjs');
  parseCachedSnapshot(snapshot, Date.parse(snapshot.observedAt));
  const target = new URL(file, 'file://' + process.cwd() + '/');
  const path = fileURLToPath(target);
  await mkdir(new URL('.', target), {recursive:true});
  const temp = path + '.tmp-' + process.pid;
  await writeFile(temp, JSON.stringify(snapshot, null, 2) + '\n', {mode:0o644});
  await rename(temp, path);
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    const snapshot = await fetchVerifiedSnapshot({
      rpcUrl: process.env.SOLANA_RPC_URL?.trim() || DEFAULT_RPC_URL
    });
    await writeSnapshot(snapshot);
    // Include only public slot and mint; never print the configured RPC URL.
    process.stdout.write('Verified finalized CLIMB mint supply snapshot published at slot ' +
      snapshot.slot + '.\n');
  } catch {
    process.stderr.write('CLIMB supply RPC unavailable or invalid; existing published snapshot unchanged.\n');
    process.exitCode = 1;
  }
}
