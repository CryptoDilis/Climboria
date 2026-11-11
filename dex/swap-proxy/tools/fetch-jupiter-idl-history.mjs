import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const programId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const baseUrl = "https://idl-one.vercel.app";
const outDir = join(process.cwd(), "artifacts", "jupiter-idl-history");
const expectedRouteV2Discriminator = "bb64facc31c4af14";

await mkdir(outDir, { recursive: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function findIdlCandidates(value, path = "$", found = []) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.content === "string") {
    const parsed = parseJson(value.content);
    if (parsed && Array.isArray(parsed.instructions)) {
      found.push({
        path: `${path}.content`,
        sourceType: value.type ?? null,
        address: value.address ?? null,
        authority: value.authority ?? null,
        version: parsed.metadata?.version ?? null,
        name: parsed.metadata?.name ?? null,
        contentSha256: sha256(value.content),
        instructions: parsed.instructions.map((instruction) => ({
          name: instruction.name,
          discriminatorHex: Array.isArray(instruction.discriminator)
            ? instruction.discriminator.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("")
            : null,
        })),
        routeV2: parsed.instructions.find((instruction) =>
          instruction.name?.toLowerCase().replaceAll("_", "") === "routev2"
        ) ?? null,
        types: (parsed.types ?? []).map((type) => {
          const variants = type.type?.variants;
          return {
            name: type.name,
            kind: type.type?.kind ?? null,
            fields: type.type?.fields?.map((field) => field.name) ?? [],
            variantCount: Array.isArray(variants) ? variants.length : null,
            variants: Array.isArray(variants) ? variants.map((variant, index) => ({
              index,
              name: variant.name,
            })) : [],
          };
        }),
      });
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findIdlCandidates(item, `${path}[${index}]`, found));
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (key !== "content") findIdlCandidates(child, `${path}.${key}`, found);
    }
  }
  return found;
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
    record.candidates = parsed ? findIdlCandidates(parsed) : [];
    await writeFile(join(outDir, `${name}-response.json`), body);
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    await writeFile(join(outDir, `${name}-error.txt`), record.error);
  }

  return record;
}

const latest = await request("latest", "/api/latest");
const history = await request("history", "/api/history");
const summary = {
  programId,
  cluster: "mainnet-beta",
  expectedCandidateRouteV2Discriminator: expectedRouteV2Discriminator,
  fetchedAt: new Date().toISOString(),
  requests: [latest, history],
  assessment: {
    anyHttpOrTransportFailure: [latest, history].some((item) => !item.ok),
    anyCandidateIdl: [latest, history].some((item) => item.candidates.length > 0),
    candidateSchemaMatchesExpectedDiscriminator: [latest, history].some((item) =>
      item.candidates.some((candidate) =>
        candidate.routeV2?.discriminator?.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("") === expectedRouteV2Discriminator
      )
    ),
  },
  safetyNote: "An IDL is interface evidence only; it does not attest to the deployed binary or prove runtime CPI account slicing and privileges.",
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (summary.assessment.anyHttpOrTransportFailure) {
  process.exitCode = 1;
}
