/**
 * Operator-only, read-only Solana genesis-hash preflight.
 *
 * The expected genesis hash MUST be corroborated outside this RPC, and is
 * configured by the operator. A provider cannot establish its own trust.
 * Never prints endpoint URLs, API keys or untrusted error messages.
 * This module is NOT imported by any wallet-signing or execute path.
 */
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";

const REQUEST_ID = "climboria-raydium-rpc-genesis-preflight";
function fail() { throw new Error("Solana RPC genesis preflight failed or mismatched expected chain"); }

export function canonicalExpectedGenesisHash(value) {
  if (typeof value !== "string") fail();
  let bytes;
  try { bytes = decodeBase58(value); } catch { fail(); }
  if (bytes.length !== 32 || encodeBase58(bytes) !== value) fail();
  return value;
}

export async function verifyExpectedRpcGenesis({
  rpcUrl, expectedGenesisHash, fetchImpl = globalThis.fetch
} = {}) {
  const expected = canonicalExpectedGenesisHash(expectedGenesisHash);
  if (typeof fetchImpl !== "function") fail();
  const url = validateRpcUrl(rpcUrl);
  // Reject unauthorized redirects and bound both response time and bytes.
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: REQUEST_ID, method: "getGenesisHash", params: [] }),
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
  } catch { fail(); }
  if (!response.ok) fail();
  let payload;
  try { payload = JSON.parse(await readBoundedBody(response)); }
  catch { fail(); }
  if (payload?.jsonrpc !== "2.0" || payload.id !== REQUEST_ID ||
      payload.error || typeof payload.result !== "string") fail();
  const actual = canonicalExpectedGenesisHash(payload.result);
  if (actual !== expected) fail();
  // This is a provider-reported genesis hash comparison only, not an
  // independent cryptographic or network-identity attestation.
  return Object.freeze({
    matchesOperatorExpectedGenesis: true,
    genesisHash: expected,
    independentlyAuditedRpcSource: false,
    approvedForJupiterCpi: false
  });
}

export async function verifyOperatorRpcGenesisSet({
  primaryRpcUrl, secondaryRpcUrl = null, expectedGenesisHash,
  fetchImpl = globalThis.fetch
} = {}) {
  const expected = canonicalExpectedGenesisHash(expectedGenesisHash);
  const first = validateRpcUrl(primaryRpcUrl);
  const second = secondaryRpcUrl ? validateRpcUrl(secondaryRpcUrl) : null;
  if (second && first.hostname === second.hostname) fail();
  await verifyExpectedRpcGenesis({ rpcUrl: first.toString(), expectedGenesisHash: expected, fetchImpl });
  if (second) {
    await verifyExpectedRpcGenesis({ rpcUrl: second.toString(), expectedGenesisHash: expected, fetchImpl });
  }
  return Object.freeze({
    matchesOperatorExpectedGenesis: true,
    witnessedRpcCount: second ? 2 : 1,
    genesisHash: expected,
    independentlyAuditedRpcSource: false,
    approvedForJupiterCpi: false
  });
}
