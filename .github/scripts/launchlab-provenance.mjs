#!/usr/bin/env node
/**
 * Read-only Raydium LaunchLab provenance check.
 * Public API and finalized Solana account reads only. Never signs or submits.
 */
import { createHash } from "node:crypto";
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
export const LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const TARGETS = Object.freeze({
  mainnet: { api: "https://api-v3.raydium.io/main/info", rpc: "https://api.mainnet-beta.solana.com" },
  devnet: { api: "https://api-v3-devnet.raydium.io/main/info", rpc: "https://api.devnet.solana.com" }
});
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function decodeBase58(value) {
  if (typeof value !== "string" || !value.length) throw new Error("Invalid base58 public key");
  const bytes = [0];
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros++;
  for (const char of value) {
    const digit = B58.indexOf(char);
    if (digit < 0) throw new Error("Invalid base58 public key");
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  const significant = bytes.length === 1 && bytes[0] === 0 ? [] : bytes.reverse();
  return Uint8Array.from([...new Array(zeros).fill(0), ...significant]);
}
export function encodeBase58(input) {
  const bytes = [...input];
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  while (digits.length > 1 && digits.at(-1) === 0) digits.pop();
  return "1".repeat(zeros) + digits.reverse().map(d => B58[d]).join("");
}
function accountBytes(account, label) {
  if (!account || account.owner !== LOADER || typeof account.data?.[0] !== "string" || account.data[1] !== "base64") {
    throw new Error(`${label} is not a base64 Upgradeable Loader account`);
  }
  return Buffer.from(account.data[0], "base64");
}
/** Decode Solana Upgradeable Loader Program (state 2) -> ProgramData PDA address. */
export function parseProgramDataAddress(programAccount) {
  const data = accountBytes(programAccount, "Program account");
  if (data.length < 36 || data.readUInt32LE(0) !== 2) throw new Error("Unexpected Upgradeable Loader Program account layout");
  const address = encodeBase58(data.subarray(4, 36));
  if (decodeBase58(address).length !== 32) throw new Error("Invalid ProgramData address in Program account");
  return address;
}
/** Decode Upgradeable Loader ProgramData (state 3), slot and optional upgrade authority. */
export function parseProgramDataAccount(programDataAccount) {
  const data = accountBytes(programDataAccount, "ProgramData account");
  if (data.length < 13 || data.readUInt32LE(0) !== 3) throw new Error("Unexpected Upgradeable Loader ProgramData layout");
  const option = data[12];
  if (option !== 0 && option !== 1) throw new Error("Invalid ProgramData upgrade-authority option tag");
  if (option === 1 && data.length < 45) throw new Error("Truncated ProgramData upgrade authority");
  const payloadOffset = option === 1 ? 45 : 13;
  const programPayload = data.subarray(payloadOffset);
  return {
    slot: Number(data.readBigUInt64LE(4)),
    upgradeAuthority: option === 1 ? encodeBase58(data.subarray(13, 45)) : null,
    immutable: option === 0,
    programDataAccountLength: data.length,
    programDataPayloadLength: programPayload.length,
    programDataAccountSha256: createHash("sha256").update(data).digest("hex"),
    programDataPayloadSha256: createHash("sha256").update(programPayload).digest("hex")
  };
}
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
    const base = {
      address,
      exists: Boolean(account),
      executable: account?.executable === true,
      owner: account?.owner ?? null,
      ownerMatchesUpgradeableLoader: account?.owner === LOADER,
      lamports: account?.lamports ?? null
    };
    if (base.exists && base.executable && base.ownerMatchesUpgradeableLoader) {
      const programDataAddress = parseProgramDataAddress(account);
      const programDataAccount = await rpcAccount(fetchImpl, target.rpc, programDataAddress);
      if (!programDataAccount) throw new Error(`${cluster} ${kind}: ProgramData account ${programDataAddress} is missing`);
      base.programDataAddress = programDataAddress;
      base.programData = parseProgramDataAccount(programDataAccount);
    }
    accounts[kind] = base;
  }
  const missing = Object.entries(accounts).filter(([, v]) =>
    !v.exists || !v.executable || !v.ownerMatchesUpgradeableLoader || !v.programData
  ).map(([k]) => k);
  return {
    cluster,
    api: { url: target.api, reachable: true, topLevelKeys: Object.keys(apiInfo).slice(0, 20) },
    rpc: target.rpc,
    programs: accounts,
    pass: missing.length === 0,
    blockers: missing.map(kind => `${kind} program/ProgramData missing or invalid`)
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
