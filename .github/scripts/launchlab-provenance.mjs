#!/usr/bin/env node
/**
 * Read-only Raydium LaunchLab provenance check.
 * Makes public HTTP/RPC reads only. Never signs, submits, or stores keys.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PROGRAMS = Object.freeze({
  mainnet: {
    launchpad: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
    cpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    lock: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE"
  },
  devnet: {
    launchpad: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    cpmm: "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb",
    lock: "DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX"
  }
});
const LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const TARGETS = Object.freeze({
  mainnet: { api: "https://api-v3.raydium.io/main/info", rpc: "https://api.mainnet-beta.solana.com" },
  devnet: { api: "https://api-v3-devnet.raydium.io/main/info", rpc: "https://api.devnet.solana.com" }
});

async function readJson(fetchImpl, url, init = {}) {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}
async function rpcAccount(fetchImpl, rpc, address) {
  const result = await readJson(fetchImpl, rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-launchlab-readonly", method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }] })
  });
  if (result.error) throw new Error(`RPC error for ${address}: ${result.error.message || "unknown"}`);
  return result.result?.value ?? null;
}
export async function verifyCluster(fetchImpl, cluster) {
  const target = TARGETS[cluster];
  if (!target) throw new Error(`Unsupported cluster: ${cluster}`);
  const apiInfo = await readJson(fetchImpl, target.api);
  if (!apiInfo || typeof apiInfo !== "object") throw new Error(`${cluster} Raydium API returned invalid JSON`);
  const accounts = {};
  for (const [kind, address] of Object.entries(PROGRAMS[cluster])) {
    const account = await rpcAccount(fetchImpl, target.rpc, address);
    accounts[kind] = {
      address,
      exists: Boolean(account),
      executable: account?.executable === true,
      owner: account?.owner ?? null,
      ownerMatchesUpgradeableLoader: account?.owner === LOADER,
      lamports: account?.lamports ?? null
    };
  }
  const missing = Object.entries(accounts).filter(([, v]) => !v.exists || !v.executable || !v.ownerMatchesUpgradeableLoader).map(([k]) => k);
  return {
    cluster,
    api: { url: target.api, reachable: true, topLevelKeys: Object.keys(apiInfo).slice(0, 20) },
    rpc: target.rpc,
    programs: accounts,
    pass: missing.length === 0,
    blockers: missing.map(kind => `${kind} program missing, non-executable, or not owned by upgradeable loader`)
  };
}
export async function runProvenanceCheck(fetchImpl = fetch) {
  const results = [];
  for (const cluster of ["mainnet", "devnet"]) {
    try { results.push(await verifyCluster(fetchImpl, cluster)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error.message || error)] }); }
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, transactionSubmitted: false, pass: results.every(x => x.pass), results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await runProvenanceCheck();
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
