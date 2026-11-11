import { pathToFileURL } from "node:url";

export const METEORA_DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
export const METEORA_BIN_ARRAY_DISCRIMINATOR = [92, 142, 92, 220, 5, 148, 70, 181];
export const METEORA_BITMAP_EXTENSION_DISCRIMINATOR = [80, 111, 124, 113, 55, 237, 18, 5];

function sameBytes(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function inspectMeteoraAccount(address, value) {
  if (typeof address !== "string" || !address.trim()) throw new Error("A Solana account address is required");
  if (value === null) {
    return {
      address,
      found: false,
      owner: null,
      executable: false,
      lamports: null,
      space: null,
      dataLength: 0,
      discriminatorHex: null,
      matchesBinArray: false,
      matchesBitmapExtension: false
    };
  }
  if (!value || typeof value.owner !== "string" || !Array.isArray(value.data) || typeof value.data[0] !== "string") {
    throw new Error("Invalid getAccountInfo result: expected owner and base64 account data");
  }
  const data = Buffer.from(value.data[0], "base64");
  const discriminator = [...data.subarray(0, 8)];
  const ownedByMeteora = value.owner === METEORA_DLMM_PROGRAM_ID;
  return {
    address,
    found: true,
    owner: value.owner,
    executable: value.executable === true,
    lamports: Number.isSafeInteger(value.lamports) ? value.lamports : null,
    space: Number.isSafeInteger(value.space) ? value.space : data.length,
    dataLength: data.length,
    discriminatorHex: discriminator.length === 8 ? Buffer.from(discriminator).toString("hex") : null,
    matchesBinArray: ownedByMeteora && sameBytes(discriminator, METEORA_BIN_ARRAY_DISCRIMINATOR),
    matchesBitmapExtension: ownedByMeteora && sameBytes(discriminator, METEORA_BITMAP_EXTENSION_DISCRIMINATOR)
  };
}

export async function fetchMeteoraAccountInfo(address, rpcUrl, fetchImpl = fetch) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//i.test(rpcUrl)) {
    throw new Error("Set JUPITER_AUDIT_RPC_URL to an HTTPS Solana RPC endpoint");
  }
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "climboria-meteora-account-audit",
      method: "getAccountInfo",
      params: [address, { commitment: "finalized", encoding: "base64" }]
    })
  });
  if (!response.ok) throw new Error("Solana RPC HTTP error: " + response.status);
  const payload = await response.json();
  if (payload.error) throw new Error("Solana RPC error: " + JSON.stringify(payload.error));
  if (!payload.result || !("value" in payload.result)) {
    throw new Error("Solana RPC returned an invalid getAccountInfo result");
  }
  return inspectMeteoraAccount(address, payload.result.value);
}

async function main() {
  const address = process.argv[2];
  if (!address) throw new Error("Usage: JUPITER_AUDIT_RPC_URL=https://... node dex/swap-proxy/tools/audit-meteora-bin-array.mjs <account-address>");
  const report = await fetchMeteoraAccountInfo(address, process.env.JUPITER_AUDIT_RPC_URL);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write("Meteora account audit failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
