import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeLegacyAnchorIdlAccount, encodeBase58 } from "./legacy-anchor-idl-account.mjs";

const programId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const baseUrl = "https://idl-one.vercel.app";
const outDir = join(process.cwd(), "artifacts", "jupiter-idl-history");
const expectedRouteV2Discriminator = "bb64facc31c4af14";
const candidateTransactionSlot = 468153382;

await mkdir(outDir, { recursive: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function rpcRequest(method, params) {
  const response = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(25000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}: ${body.slice(0, 500)}`);
  const parsed = parseJson(body);
  if (!parsed) throw new Error("Solana RPC returned non-JSON response");
  if (parsed.error) throw new Error(`Solana RPC ${method} error: ${JSON.stringify(parsed.error)}`);
  return parsed.result;
}

async function fetchAccountInfo(address) {
  const result = await rpcRequest("getAccountInfo", [address, {
    encoding: "base64",
    commitment: "finalized",
  }]);
  return {
    contextSlot: result.context?.slot ?? null,
    value: result.value ?? null,
  };
}

async function auditOnChainProvenance(anchorAddress, activeRevision) {
  const report = {
    endpoint: "https://api.mainnet-beta.solana.com",
    commitment: "finalized",
    fetchedAt: new Date().toISOString(),
    idlAccount: null,
    programAccount: null,
    programDataAccount: null,
    error: null,
  };
  try {
    if (!anchorAddress) throw new Error("IDL Explorer did not return an Anchor metadata account address");
    const idlInfo = await fetchAccountInfo(anchorAddress);
    if (!idlInfo.value) throw new Error(`Anchor IDL metadata account not found: ${anchorAddress}`);
    const idlAccountBytes = Buffer.from(idlInfo.value.data?.[0] ?? "", "base64");
    let decodedIdlAccount = null;
    let payloadError = null;
    try {
      decodedIdlAccount = decodeLegacyAnchorIdlAccount(idlAccountBytes);
    } catch (error) {
      payloadError = error instanceof Error ? error.message : String(error);
    }
    const payloadSha256 = decodedIdlAccount?.decompressedPayloadSha256 ?? null;
    const payloadMatchesHistory = payloadSha256 !== null &&
      payloadSha256 === activeRevision?.contentSha256;
    const payloadRouteV2Discriminator = decodedIdlAccount?.routeV2Discriminator ?? null;
    report.idlAccount = {
      address: anchorAddress,
      contextSlot: idlInfo.contextSlot,
      owner: idlInfo.value.owner,
      ownerMatchesJupiterProgram: idlInfo.value.owner === programId,
      executable: idlInfo.value.executable,
      lamports: idlInfo.value.lamports,
      dataLength: idlAccountBytes.length,
      accountDataSha256: sha256(idlAccountBytes),
      accountLayout: decodedIdlAccount?.layout ?? "unparsed",
      accountPrefixHex: decodedIdlAccount?.prefixHex ?? null,
      prefixMatchesAnchorAccountDiscriminator: decodedIdlAccount?.prefixMatchesAnchorAccountDiscriminator ?? null,
      authority: decodedIdlAccount?.authority ?? null,
      declaredPayloadLength: decodedIdlAccount?.declaredPayloadLength ?? null,
      compressedPayloadLength: decodedIdlAccount?.compressedPayloadLength ?? null,
      decompressedPayloadLength: decodedIdlAccount?.decompressedPayloadLength ?? null,
      decompressedPayloadSha256: payloadSha256,
      decompressedPayloadMatchesActiveHistory: payloadMatchesHistory,
      decompressedRouteV2Discriminator: payloadRouteV2Discriminator,
      payloadError,
    };

    const programInfo = await fetchAccountInfo(programId);
    if (!programInfo.value) throw new Error("Jupiter program account not found through finalized RPC");
    const programBytes = Buffer.from(programInfo.value.data?.[0] ?? "", "base64");
    const programState = programBytes.length >= 36 ? programBytes.readUInt32LE(0) : null;
    const upgradeableLoader = "BPFLoaderUpgradeab1e11111111111111111111111";
    let programDataAddress = null;
    if (programState === 2) programDataAddress = encodeBase58(programBytes.subarray(4, 36));
    report.programAccount = {
      address: programId,
      contextSlot: programInfo.contextSlot,
      owner: programInfo.value.owner,
      executable: programInfo.value.executable,
      dataLength: programBytes.length,
      accountDataSha256: sha256(programBytes),
      upgradeableLoaderOwner: programInfo.value.owner === upgradeableLoader,
      stateTag: programState,
      programDataAddress,
    };

    if (programDataAddress) {
      const programDataInfo = await fetchAccountInfo(programDataAddress);
      if (!programDataInfo.value) throw new Error("Jupiter ProgramData account not found through finalized RPC");
      const bytes = Buffer.from(programDataInfo.value.data?.[0] ?? "", "base64");
      const stateTag = bytes.length >= 4 ? bytes.readUInt32LE(0) : null;
      const deploymentSlot = bytes.length >= 12 ? bytes.readBigUInt64LE(4).toString() : null;
      const authorityOption = bytes.length >= 13 ? bytes[12] : null;
      const headerLength = authorityOption === 1 ? 45 : 13;
      const upgradeAuthority = authorityOption === 1 && bytes.length >= 45
        ? encodeBase58(bytes.subarray(13, 45))
        : null;
      const binary = bytes.subarray(Math.min(headerLength, bytes.length));
      report.programDataAccount = {
        address: programDataAddress,
        contextSlot: programDataInfo.contextSlot,
        owner: programDataInfo.value.owner,
        executable: programDataInfo.value.executable,
        dataLength: bytes.length,
        accountDataSha256: sha256(bytes),
        stateTag,
        deploymentSlot,
        deployedAtOrBeforeCandidateSlot: deploymentSlot !== null &&
          BigInt(deploymentSlot) <= BigInt(candidateTransactionSlot),
        upgradeAuthorityOption: authorityOption,
        upgradeAuthority,
        binaryLength: binary.length,
        binarySha256: sha256(binary),
        loaderOwnerMatches: programDataInfo.value.owner === upgradeableLoader,
      };
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  }
  return report;
}

function findIdlCandidates(value, path = "$", found = [], rootMetadata = {}) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.content === "string") {
    const parsed = parseJson(value.content);
    if (parsed && Array.isArray(parsed.instructions)) {
      const route = parsed.instructions.find((instruction) =>
        instruction.name?.toLowerCase().replaceAll("_", "") === "routev2"
      );
      const routePlanStepV2 = (parsed.types ?? []).find((type) => type.name === "RoutePlanStepV2");
      const swap = (parsed.types ?? []).find((type) => type.name === "Swap");
      const variants = swap?.type?.variants ?? [];
      found.push({
        path: `${path}.content`,
        sourceType: value.type ?? null,
        metadataAccountAddress: rootMetadata.anchorAddress ?? null,
        pmpMetadataAccountAddress: rootMetadata.pmpAddress ?? null,
        authority: value.authority ?? null,
        recordVersion: value.version ?? null,
        slot: value.slot ?? null,
        time: value.time ?? null,
        activeFrom: value.activeFrom ?? null,
        activeTo: value.activeTo ?? null,
        valid: value.valid ?? null,
        idlVersion: parsed.metadata?.version ?? null,
        name: parsed.metadata?.name ?? null,
        contentSha256: sha256(value.content),
        routeV2: route ? {
          name: route.name,
          discriminatorHex: Array.isArray(route.discriminator)
            ? route.discriminator.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("")
            : null,
          args: route.args ?? [],
        } : null,
        routePlanStepV2: routePlanStepV2?.type ?? null,
        swapEnum: swap ? {
          variantCount: variants.length,
          variantsOfInterest: [47, 75, 81, 181].filter((index) => variants[index]).map((index) => ({
            index,
            ...variants[index],
          })),
        } : null,
      });
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findIdlCandidates(item, `${path}[${index}]`, found, rootMetadata));
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (key !== "content") findIdlCandidates(child, `${path}.${key}`, found, rootMetadata);
    }
  }
  return found;
}

function isActiveAtSlot(candidate, slot) {
  if (!candidate.slot) return false;
  const target = BigInt(slot);
  const start = BigInt(candidate.activeFrom?.slot ?? candidate.slot);
  const endValue = candidate.activeTo?.slot ?? candidate.activeTo;
  const end = endValue && endValue !== "current" ? BigInt(endValue) : null;
  return start <= target && (end === null || target < end);
}

async function request(name, endpoint) {
  const url = new URL(endpoint, baseUrl);
  url.searchParams.set("programId", programId);
  url.searchParams.set("cluster", "mainnet-beta");

  const record = {
    name,
    url: url.toString(),
    fetchedAt: new Date().toISOString(),
    status: null,
    ok: false,
    responseSha256: null,
    responseBytes: 0,
    error: null,
    candidates: [],
  };

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(290_000) });
    const body = await response.text();
    record.status = response.status;
    record.ok = response.ok;
    record.responseSha256 = sha256(body);
    record.responseBytes = Buffer.byteLength(body);
    const parsed = parseJson(body);
    record.responseKeys = parsed && typeof parsed === "object" ? Object.keys(parsed) : [];
    record.metadataAccounts = parsed ? {
      anchorAddress: parsed.anchorAddress ?? null,
      pmpAddress: parsed.pmpAddress ?? null,
    } : null;
    record.candidates = parsed ? findIdlCandidates(parsed, "$", [], parsed) : [];
    await writeFile(join(outDir, `${name}-response.json`), body);
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    await writeFile(join(outDir, `${name}-error.txt`), record.error);
  }

  return record;
}

const latest = await request("latest", "/api/latest");
const history = await request("history", "/api/history");
const matchingHistory = history.candidates.filter((candidate) =>
  candidate.routeV2?.discriminatorHex === expectedRouteV2Discriminator
);
const activeHistory = matchingHistory.filter((candidate) =>
  isActiveAtSlot(candidate, candidateTransactionSlot)
);
const activeRevision = activeHistory.length === 1 ? activeHistory[0] : null;
const anchorAddress = history.metadataAccounts?.anchorAddress ?? latest.metadataAccounts?.anchorAddress ?? null;
const onChainProvenance = await auditOnChainProvenance(anchorAddress, activeRevision);
const summary = {
  programId,
  cluster: "mainnet-beta",
  candidateTransactionSlot,
  expectedCandidateRouteV2Discriminator: expectedRouteV2Discriminator,
  fetchedAt: new Date().toISOString(),
  requests: [latest, history],
  onChainProvenance,
  activeRevisionForCandidateSlot: activeRevision ? {
    sourceType: activeRevision.sourceType,
    metadataAccountAddress: activeRevision.metadataAccountAddress,
    authority: activeRevision.authority,
    recordVersion: activeRevision.recordVersion,
    slot: activeRevision.slot,
    time: activeRevision.time,
    activeFrom: activeRevision.activeFrom,
    activeTo: activeRevision.activeTo,
    valid: activeRevision.valid,
    idlVersion: activeRevision.idlVersion,
    contentSha256: activeRevision.contentSha256,
    routeV2: activeRevision.routeV2,
    routePlanStepV2: activeRevision.routePlanStepV2,
    swapEnum: activeRevision.swapEnum,
  } : null,
  assessment: {
    anyHttpOrTransportFailure: [latest, history].some((item) => !item.ok),
    anyCandidateIdl: [latest, history].some((item) => item.candidates.length > 0),
    candidateSchemaMatchesExpectedDiscriminator: [latest, history].some((item) =>
      item.candidates.some((candidate) =>
        candidate.routeV2?.discriminatorHex === expectedRouteV2Discriminator
      )
    ),
    matchingHistoricalRevisionCount: matchingHistory.length,
    activeHistoricalRevisionCount: activeHistory.length,
    exactlyOneRevisionCoversCandidateSlot: activeHistory.length === 1,
  },
  safetyNote: "An IDL is interface evidence only; the Explorer response does not attest to deployed binary identity or prove runtime CPI account slicing and privileges.",
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (summary.assessment.anyHttpOrTransportFailure || !summary.assessment.exactlyOneRevisionCoversCandidateSlot) {
  process.exitCode = 1;
}
