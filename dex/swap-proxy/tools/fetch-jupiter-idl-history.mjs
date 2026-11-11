import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
const summary = {
  programId,
  cluster: "mainnet-beta",
  candidateTransactionSlot,
  expectedCandidateRouteV2Discriminator: expectedRouteV2Discriminator,
  fetchedAt: new Date().toISOString(),
  requests: [latest, history],
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
