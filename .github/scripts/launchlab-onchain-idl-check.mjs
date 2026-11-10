#!/usr/bin/env node
/**
 * Read-only fetch of Anchor's legacy on-chain IDL account for Raydium LaunchLab.
 * Uses getAccountInfo only; never signs or submits transactions.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { PublicKey } from "@solana/web3.js";

const PROGRAMS = {
  mainnet: { id: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj", rpc: "https://api.mainnet-beta.solana.com" },
  devnet: { id: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6", rpc: "https://api.devnet.solana.com" }
};
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

async function readAccount(rpc, address) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-anchor-idl-readonly", method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }] }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "Solana RPC error");
  return json.result?.value ?? null;
}
async function fetchCluster(cluster, repoIdl) {
  const target = PROGRAMS[cluster];
  const programId = new PublicKey(target.id);
  const [base] = PublicKey.findProgramAddressSync([], programId);
  const idlAddress = await PublicKey.createWithSeed(base, "anchor:idl", programId);
  const account = await readAccount(target.rpc, idlAddress.toBase58());
  if (!account) throw new Error(`${cluster}: Anchor IDL account ${idlAddress.toBase58()} not found`);
  if (account.owner !== target.id) throw new Error(`${cluster}: IDL account owner mismatch: ${account.owner}`);
  if (account.executable) throw new Error(`${cluster}: IDL metadata account unexpectedly executable`);
  const raw = Buffer.from(account.data[0], "base64");
  if (raw.length < 44) throw new Error(`${cluster}: IDL account shorter than Anchor header`);
  const authority = new PublicKey(raw.subarray(8, 40)).toBase58();
  const declaredLength = raw.readUInt32LE(40);
  const compressed = raw.subarray(44);
  const inflated = inflateSync(compressed);
  if (inflated.length !== declaredLength) throw new Error(`${cluster}: IDL declared length mismatch (${declaredLength} vs ${inflated.length})`);
  const liveIdl = JSON.parse(inflated.toString("utf8"));
  if (liveIdl.address !== target.id) throw new Error(`${cluster}: live IDL address mismatch: ${liveIdl.address}`);
  const repoInstructions = new Map(repoIdl.instructions.map(x => [x.name, x]));
  const liveInstructions = new Map(liveIdl.instructions.map(x => [x.name, x]));
  const mismatches = [];
  for (const [name, repoInstruction] of repoInstructions) {
    const liveInstruction = liveInstructions.get(name);
    if (!liveInstruction) mismatches.push(`missing on-chain instruction: ${name}`);
    else if (JSON.stringify(liveInstruction.discriminator) !== JSON.stringify(repoInstruction.discriminator)) mismatches.push(`discriminator mismatch: ${name}`);
  }
  for (const name of liveInstructions.keys()) if (!repoInstructions.has(name)) mismatches.push(`on-chain-only instruction: ${name}`);
  const sameInstructionSet = mismatches.length === 0;
  return {
    cluster, rpc: target.rpc, programId: target.id, idlAddress: idlAddress.toBase58(),
    accountOwner: account.owner, authority, declaredLength, compressedBytes: compressed.length,
    liveIdlSha256: sha(inflated), repositoryIdlSha256: sha(Buffer.from(JSON.stringify(repoIdl))),
    liveIdlName: liveIdl.metadata?.name, liveIdlVersion: liveIdl.metadata?.version,
    liveInstructionCount: liveIdl.instructions?.length ?? 0,
    repositoryInstructionCount: repoIdl.instructions.length,
    sameInstructionSet, mismatches, pass: sameInstructionSet
  };
}
export async function verifyOnchainLaunchpadIdl(repoIdlPath) {
  const repoIdl = JSON.parse(await readFile(repoIdlPath, "utf8"));
  const results = [];
  for (const cluster of ["mainnet", "devnet"]) {
    try { results.push(await fetchCluster(cluster, repoIdl)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error.message || error)] }); }
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, transactionSubmitted: false, pass: results.every(x => x.pass), results };
}
if (process.argv[1]?.endsWith("launchlab-onchain-idl-check.mjs")) {
  const idlPath = process.argv[2];
  if (!idlPath) throw new Error("Usage: node launchlab-onchain-idl-check.mjs launchpad-idl.json");
  const report = await verifyOnchainLaunchpadIdl(idlPath);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
