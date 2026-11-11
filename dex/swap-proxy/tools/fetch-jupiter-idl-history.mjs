import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeLegacyAnchorIdlAccount, encodeBase58 } from "./legacy-anchor-idl-account.mjs";
import { decodeSplTokenAccountSummary } from "./spl-token-account-summary.mjs";
import { classifyDexAdapterIdlEvidence } from "./dex-adapter-idl-status.mjs";
import { auditRaydiumLaunchlabCandidateAccounts } from "./raydium-launchlab-account-audit.mjs";

const programId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const baseUrl = "https://idl-one.vercel.app";
const outDir = join(process.cwd(), "artifacts", "jupiter-idl-history");
const expectedRouteV2Discriminator = "bb64facc31c4af14";
const candidateTransactionSlot = 468153382;
const legacyTokenProgramId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

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

async function fetchMultipleAccountInfo(addresses) {
  const result = await rpcRequest("getMultipleAccounts", [addresses, {
    encoding: "base64",
    commitment: "finalized",
  }]);
  return {
    contextSlot: result.context?.slot ?? null,
    values: result.value ?? [],
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

      // Classify unexplained outer accounts from this preserved route_v2 candidate.
      // Only public account metadata is retained; account data bytes are never emitted.
      try {
        const candidates = [
          { outerPosition: 10, address: "EaUghZfmuhgtZEEwaZwX5EBroz4WyH8VM5NSXi4tam5A" },
          { outerPosition: 79, address: "GN2CGUyYYLakXQmeiNtfvxcNDviKM9biqQMnxfEPzF4C" },
          { outerPosition: 84, address: "jitodontfront1111111111111111JustUseJupiter" },
        ];
        const accounts = await fetchMultipleAccountInfo(candidates.map((item) => item.address));
        report.candidateOuterAccountObservations = candidates.map((item, index) => {
          const value = accounts.values[index] ?? null;
          const bytes = value ? Buffer.from(value.data?.[0] ?? "", "base64") : Buffer.alloc(0);
          return {
            outerPosition: item.outerPosition,
            address: item.address,
            contextSlot: accounts.contextSlot,
            found: value !== null,
            owner: value?.owner ?? null,
            executable: value?.executable ?? null,
            lamports: value?.lamports ?? null,
            dataLength: value ? bytes.length : null,
            accountDataSha256: value ? sha256(bytes) : null,
            prefixHex: value ? bytes.subarray(0, 8).toString("hex") : null,
            splTokenAccount: value?.owner === legacyTokenProgramId
              ? decodeSplTokenAccountSummary(bytes)
              : null,
          };
        });
      } catch (error) {
        report.candidateOuterAccountObservationsError =
          error instanceof Error ? error.message : String(error);
      }
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

const dexCpiPrograms = [
  {
    slug: "kipseli",
    programId: "3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU",
    expectedInstructionName: "swap_v3",
    expectedDiscriminatorHex: "f0e02621b01ff1af",
  },
  {
    slug: "orca-whirlpool",
    programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    expectedInstructionName: "swap_v2",
    expectedDiscriminatorHex: "2b04ed0b1ac91e62",
  },
  {
    slug: "meteora-dlmm",
    programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    expectedInstructionName: "swap2",
    expectedDiscriminatorHex: "414b3f4ceb5b5b88",
  },
  {
    slug: "raydium-launchlab",
    programId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
    expectedInstructionName: "buy_exact_in",
    expectedDiscriminatorHex: "faea0d7bd59c13ec",
  },
];

function collectDexInstructionCandidates(value, expectedDiscriminatorHex, path = "$", found = [], root = {}) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.content === "string") {
    const parsed = parseJson(value.content);
    if (parsed && Array.isArray(parsed.instructions)) {
      const matches = parsed.instructions.filter((instruction) =>
        Array.isArray(instruction.discriminator) &&
        Buffer.from(instruction.discriminator).toString("hex") === expectedDiscriminatorHex
      );
      if (matches.length > 0) {
        found.push({
          path: `${path}.content`,
          sourceType: value.type ?? null,
          metadataAccountAddress: value.address ?? value.metadataAccountAddress ?? root.anchorAddress ?? root.pmpAddress ?? null,
          authority: value.authority ?? null,
          recordVersion: value.version ?? null,
          slot: value.slot ?? null,
          time: value.time ?? null,
          activeFrom: value.activeFrom ?? null,
          activeTo: value.activeTo ?? null,
          valid: value.valid ?? null,
          idlName: parsed.metadata?.name ?? null,
          idlVersion: parsed.metadata?.version ?? null,
          contentSha256: sha256(value.content),
          matchingInstructions: matches.map((instruction) => ({
            name: instruction.name,
            discriminatorHex: Buffer.from(instruction.discriminator).toString("hex"),
            accounts: instruction.accounts ?? [],
            args: instruction.args ?? [],
          })),
        });
      }
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectDexInstructionCandidates(item, expectedDiscriminatorHex, `${path}[${index}]`, found, root)
    );
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (key !== "content") {
        collectDexInstructionCandidates(child, expectedDiscriminatorHex, `${path}.${key}`, found, root);
      }
    }
  }
  return found;
}


async function auditDexCpiOnChainProvenance(program, metadataAccounts, activeRevisions, latestCandidates) {
  const report = {
    endpoint: "https://api.mainnet-beta.solana.com",
    commitment: "finalized",
    fetchedAt: new Date().toISOString(),
    programId: program.programId,
    expectedInstructionName: program.expectedInstructionName,
    expectedDiscriminatorHex: program.expectedDiscriminatorHex,
    anchorMetadataAccountAddress: metadataAccounts?.anchorAddress ?? null,
    programAccount: null,
    programDataAccount: null,
    idlAccount: null,
    error: null,
  };
  try {
    const anchorAddress = metadataAccounts?.anchorAddress ?? null;
    const addresses = anchorAddress && anchorAddress !== program.programId
      ? [program.programId, anchorAddress] : [program.programId];
    const accountResult = await fetchMultipleAccountInfo(addresses);
    const programInfo = { contextSlot: accountResult.contextSlot, value: accountResult.values[0] ?? null };
    const idlInfo = anchorAddress && anchorAddress !== program.programId
      ? { contextSlot: accountResult.contextSlot, value: accountResult.values[1] ?? null } : null;
    if (!programInfo.value) throw new Error("DEX program account not found through finalized RPC");

    const programBytes = Buffer.from(programInfo.value.data?.[0] ?? "", "base64");
    const programState = programBytes.length >= 4 ? programBytes.readUInt32LE(0) : null;
    const upgradeableLoader = "BPFLoaderUpgradeab1e11111111111111111111111";
    const programDataAddress = programState === 2 && programBytes.length >= 36
      ? encodeBase58(programBytes.subarray(4, 36)) : null;
    report.programAccount = {
      address: program.programId,
      contextSlot: programInfo.contextSlot,
      owner: programInfo.value.owner,
      executable: programInfo.value.executable,
      dataLength: programBytes.length,
      accountDataSha256: sha256(programBytes),
      loaderOwnerMatches: programInfo.value.owner === upgradeableLoader,
      stateTag: programState,
      programDataAddress,
    };

    if (programDataAddress) {
      const info = await fetchAccountInfo(programDataAddress);
      if (!info.value) throw new Error("DEX ProgramData account not found through finalized RPC");
      const bytes = Buffer.from(info.value.data?.[0] ?? "", "base64");
      const stateTag = bytes.length >= 4 ? bytes.readUInt32LE(0) : null;
      const deploymentSlot = bytes.length >= 12 ? bytes.readBigUInt64LE(4).toString() : null;
      const authorityOption = bytes.length >= 13 ? bytes[12] : null;
      const headerLength = authorityOption === 1 ? 45 : 13;
      const binary = bytes.subarray(Math.min(headerLength, bytes.length));
      report.programDataAccount = {
        address: programDataAddress,
        contextSlot: info.contextSlot,
        owner: info.value.owner,
        dataLength: bytes.length,
        accountDataSha256: sha256(bytes),
        stateTag,
        deploymentSlot,
        deployedAtOrBeforeCandidateSlot: deploymentSlot !== null &&
          BigInt(deploymentSlot) <= BigInt(candidateTransactionSlot),
        upgradeAuthorityOption: authorityOption,
        upgradeAuthority: authorityOption === 1 && bytes.length >= 45
          ? encodeBase58(bytes.subarray(13, 45)) : null,
        binaryLength: binary.length,
        binarySha256: sha256(binary),
        loaderOwnerMatches: info.value.owner === upgradeableLoader,
      };
    }

    if (!anchorAddress) {
      report.idlAccount = { found: false, error: "IDL Explorer did not provide an Anchor metadata account address" };
    } else if (!idlInfo?.value) {
      report.idlAccount = { address: anchorAddress, found: false, error: "Anchor metadata account not found through finalized RPC" };
    } else {
      const bytes = Buffer.from(idlInfo.value.data?.[0] ?? "", "base64");
      const record = {
        address: anchorAddress,
        contextSlot: idlInfo.contextSlot,
        owner: idlInfo.value.owner,
        ownerMatchesProgram: idlInfo.value.owner === program.programId,
        executable: idlInfo.value.executable,
        dataLength: bytes.length,
        accountDataSha256: sha256(bytes),
        found: true,
        decodeError: null,
        idlName: null,
        idlVersion: null,
        prefixHex: null,
        prefixMatchesAnchorIdlDiscriminator: null,
        decompressedPayloadSha256: null,
        payloadMatchesActiveHistoricalRevision: null,
        payloadMatchesAnyActiveHistoricalRevision: null,
        activeHistoricalRevisionCount: activeRevisions.length,
        instruction: null,
        instructionSchemaSha256: null,
        instructionSchemaMatchesActiveHistory: null,
        instructionSchemaMatchesAnyActiveHistory: null,
        instructionSchemaMatchesLatest: null,
        poolStateType: null,
        poolStateTypeDefinitions: null,
        poolStateAccountDiscriminator: null,
      };
      try {
        const decoded = decodeLegacyAnchorIdlAccount(bytes);
        const findInstruction = (items) => items?.find((item) =>
          item.name === program.expectedInstructionName ||
          (Array.isArray(item.discriminator) && Buffer.from(item.discriminator).toString("hex") === program.expectedDiscriminatorHex)
        ) ?? null;
        const summarize = (item) => item ? {
          name: item.name,
          discriminatorHex: Array.isArray(item.discriminator)
            ? Buffer.from(item.discriminator).toString("hex")
            : item.discriminatorHex ?? null,
          accounts: item.accounts ?? [],
        } : null;
        const schemaHash = (item) => item ? sha256(JSON.stringify(summarize(item))) : null;
        const instruction = findInstruction(decoded.idl.instructions);
        const poolStateType = decoded.idl.types?.find((item) => item.name === "PoolState") ?? null;
        const poolStateAccount = decoded.idl.accounts?.find((item) => item.name === "PoolState") ?? null;
        const activeInstructions = activeRevisions.flatMap(revision => revision.matchingInstructions ?? []);
        const active = findInstruction(activeInstructions);
        const latest = findInstruction(latestCandidates.flatMap(candidate => candidate.matchingInstructions ?? []));
        const activeSchemaMatches = activeInstructions.some(item => schemaHash(item) === schemaHash(instruction));
        record.idlName = decoded.idl.metadata?.name ?? decoded.idl.name ?? null;
        record.idlVersion = decoded.idl.metadata?.version ?? null;
        record.prefixHex = decoded.prefixHex;
        record.prefixMatchesAnchorIdlDiscriminator = decoded.prefixMatchesAnchorAccountDiscriminator;
        record.decompressedPayloadSha256 = decoded.decompressedPayloadSha256;
        record.payloadMatchesActiveHistoricalRevision = activeRevisions.length === 1
          ? decoded.decompressedPayloadSha256 === activeRevisions[0].contentSha256 : null;
        record.payloadMatchesAnyActiveHistoricalRevision = activeRevisions.some(revision =>
          decoded.decompressedPayloadSha256 === revision.contentSha256
        );
        record.poolStateType = poolStateType;
        record.poolStateTypeDefinitions = decoded.idl.types ?? [];
        record.poolStateAccountDiscriminator = poolStateAccount?.discriminator ?? null;
        record.instruction = summarize(instruction);
        record.instructionSchemaSha256 = schemaHash(instruction);
        record.instructionSchemaMatchesActiveHistory = active
          ? record.instructionSchemaSha256 === schemaHash(active) : null;
        record.instructionSchemaMatchesAnyActiveHistory = activeSchemaMatches;
        record.instructionSchemaMatchesLatest = latest
          ? record.instructionSchemaSha256 === schemaHash(latest) : null;
      } catch (error) {
        record.decodeError = error instanceof Error ? error.message : String(error);
      }
      report.idlAccount = record;
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  }
  return report;
}

async function fetchDexCpiProgramHistory(program) {
  const responses = {};
  for (const kind of ["latest", "history"]) {
    const url = new URL(kind === "latest" ? "/api/latest" : "/api/history", baseUrl);
    url.searchParams.set("programId", program.programId);
    url.searchParams.set("cluster", "mainnet-beta");
    const record = {
      url: url.toString(),
      status: null,
      ok: false,
      responseSha256: null,
      responseBytes: 0,
      error: null,
      candidates: [],
    };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      const body = await response.text();
      record.status = response.status;
      record.ok = response.ok;
      record.responseSha256 = sha256(body);
      record.responseBytes = Buffer.byteLength(body);
      const parsed = parseJson(body);
      record.responseKeys = parsed && typeof parsed === "object" ? Object.keys(parsed) : [];
      record.metadataAccounts = parsed && typeof parsed === "object" ? {
        anchorAddress: parsed.anchorAddress ?? null,
        pmpAddress: parsed.pmpAddress ?? null,
      } : null;
      record.candidates = parsed
        ? collectDexInstructionCandidates(parsed, program.expectedDiscriminatorHex, "$", [], parsed)
        : [];
      await writeFile(join(outDir, `dex-${program.slug}-${kind}-response.json`), body);
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
      await writeFile(join(outDir, `dex-${program.slug}-${kind}-error.txt`), record.error);
    }
    responses[kind] = record;
  }

  const matchingHistory = responses.history.candidates;
  const activeHistory = matchingHistory.filter((candidate) =>
    isActiveAtSlot(candidate, candidateTransactionSlot)
  );
  const latestMatches = responses.latest.candidates;
  const schemaHash = (candidate) => sha256(JSON.stringify(candidate.matchingInstructions));
  const activeSchemaHashes = [...new Set(activeHistory.map(schemaHash))];
  const latestHistoryComparisons = activeHistory.map((historical) => {
    const latestForSource = latestMatches.find((candidate) =>
      candidate.sourceType === historical.sourceType
    );
    return {
      sourceType: historical.sourceType,
      historicalContentSha256: historical.contentSha256,
      latestContentSha256: latestForSource?.contentSha256 ?? null,
      historicalInstructionSchemaSha256: schemaHash(historical),
      latestInstructionSchemaSha256: latestForSource ? schemaHash(latestForSource) : null,
      latestAndHistoryInstructionSchemasAgree: Boolean(
        latestForSource && schemaHash(latestForSource) === schemaHash(historical)
      ),
    };
  });
  const metadataAccounts = responses.history.metadataAccounts ?? responses.latest.metadataAccounts ?? null;
  const onChainProvenance = await auditDexCpiOnChainProvenance(
    program, metadataAccounts, activeHistory, latestMatches,
  );
  return {
    slug: program.slug,
    programId: program.programId,
    expectedInstructionName: program.expectedInstructionName,
    onChainProvenance,
    expectedDiscriminatorHex: program.expectedDiscriminatorHex,
    latest: responses.latest,
    history: responses.history,
    matchingHistoricalRevisionCount: matchingHistory.length,
    activeHistoricalRevisionCount: activeHistory.length,
    exactlyOneRevisionCoversCandidateSlot: activeHistory.length === 1,
    activeInstructionSchemaVariantCount: activeSchemaHashes.length,
    activeSourcesAgreeOnInstructionSchema: activeHistory.length > 0 && activeSchemaHashes.length === 1,
    activeInstructionSchemaSha256: activeSchemaHashes.length === 1 ? activeSchemaHashes[0] : null,
    latestHistoryComparisons,
    allLatestAndActiveHistorySchemasAgree:
      latestHistoryComparisons.length > 0 &&
      latestHistoryComparisons.every((comparison) => comparison.latestAndHistoryInstructionSchemasAgree),
    activeRevisionsForCandidateSlot: activeHistory,
    activeRevisionForCandidateSlot: activeHistory.length === 1 ? activeHistory[0] : null,
    latestMatchingInstructions: latestMatches.flatMap((candidate) => candidate.matchingInstructions),
  };
}

const dexCpiIdlHistory = [];
for (const program of dexCpiPrograms) {
  dexCpiIdlHistory.push(await fetchDexCpiProgramHistory(program));
}

for (const item of dexCpiIdlHistory) {
  const onChain = item.onChainProvenance;
  item.releaseEvidence = classifyDexAdapterIdlEvidence({
    candidateTransactionSlot,
    activeHistoricalRevisionCount: item.activeHistoricalRevisionCount,
    activeSourcesAgreeOnInstructionSchema: item.activeSourcesAgreeOnInstructionSchema,
    latestAndActiveHistorySchemasAgree: item.allLatestAndActiveHistorySchemasAgree,
    programLoaderOwnerMatches: onChain.programAccount?.loaderOwnerMatches === true,
    programDataDeploymentSlot: onChain.programDataAccount?.deploymentSlot ?? null,
    onChainIdlFound: onChain.idlAccount?.found === true,
    onChainIdlOwnerMatchesProgram: onChain.idlAccount?.ownerMatchesProgram === true,
    onChainInstructionSchemaMatchesActiveHistory:
      onChain.idlAccount?.instructionSchemaMatchesAnyActiveHistory === true,
    onChainPayloadMatchesActiveHistory:
      onChain.idlAccount?.payloadMatchesAnyActiveHistoricalRevision === true,
  });
}

const raydiumLaunchlabCandidateExpected = {
  programId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  poolState: "9zAS77Nf22XQ9QrFQH7n1hAu2uCZuDuMzEzmwXKFxm7A",
  globalConfig: "7yXLcuU4HNEjjEYbz7rAYJUK11SXfdR6df84LyfEQWuM",
  platformConfig: "6BwHHDg3u1854jC8PDLXvR4spTcLNaoBxLJNGC4nTESt",
  baseMint: "AydYhVjdXnyLEvdBroRbCoSkVykozfkE5mLo67Bcz7EY",
  quoteMint: "NKEda5nHhNGgjrE9nDdMvaEmkmJ96qqxzBVZEcKmjSg",
  authority: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
  eventAuthority: "2DPAtwB8L12vrMRExbLuyGnC7n2J5LNoZQSejeQGpwkr",
  platformFeeVault: "8hBWSL5QYTm2duzdSutVEGBrF6QjX44aXi8WRSrErY3y",
  creatorFeeVault: "5VJj74eKHTjtVRgW7J5L7qFE8nw8DQcpnP8Zri9o8Hpk",
  systemProgram: "11111111111111111111111111111111",
  quoteTokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  nativeLoaderProgram: "NativeLoader1111111111111111111111111",
};

async function auditRaydiumLaunchlabCandidateAccountState() {
  const raydium = dexCpiIdlHistory.find((item) => item.slug === "raydium-launchlab");
  const idlAccount = raydium?.onChainProvenance?.idlAccount;
  const idlTrusted = idlAccount?.found === true &&
    idlAccount.ownerMatchesProgram === true &&
    idlAccount.payloadMatchesAnyActiveHistoricalRevision === true &&
    raydium.onChainProvenance.programDataAccount?.deployedAtOrBeforeCandidateSlot === true &&
    idlAccount.poolStateType?.type?.kind === "struct" &&
    Array.isArray(idlAccount.poolStateAccountDiscriminator);
  if (!idlTrusted) {
    return {
      status: "incomplete",
      commitment: "finalized",
      error: "Candidate-slot Raydium IDL/program provenance did not provide a trusted PoolState layout",
    };
  }

  try {
    const names = ["poolState", "platformFeeVault", "creatorFeeVault", "systemProgram"];
    const addresses = names.map((name) => raydiumLaunchlabCandidateExpected[name]);
    const fetched = await fetchMultipleAccountInfo(addresses);
    const accounts = Object.fromEntries(names.map((name, index) => [
      name,
      { value: fetched.values[index] ?? null, contextSlot: fetched.contextSlot },
    ]));
    const idl = {
      accounts: [{ name: "PoolState", discriminator: idlAccount.poolStateAccountDiscriminator }],
      types: idlAccount.poolStateTypeDefinitions ?? [idlAccount.poolStateType],
    };
    const report = auditRaydiumLaunchlabCandidateAccounts({
      accounts: { ...accounts, contextSlot: fetched.contextSlot },
      idl,
      expected: raydiumLaunchlabCandidateExpected,
    });
    report.accountDataSha256 = Object.fromEntries(names.map((name) => {
      const value = accounts[name].value;
      return [name, value ? sha256(Buffer.from(value.data?.[0] ?? "", "base64")) : null];
    }));
    report.accountChecksStatus = report.status;
    report.activeHistoricalRevisionCount = raydium.activeHistoricalRevisionCount;
    report.programDataDeploymentCoversCandidateSlot =
      raydium.onChainProvenance.programDataAccount?.deployedAtOrBeforeCandidateSlot === true;
    report.idlProvenanceUniqueAtCandidateSlot = raydium.activeHistoricalRevisionCount === 1;
    if (!report.idlProvenanceUniqueAtCandidateSlot && report.status === "matched") {
      report.status = "incomplete";
      report.provenanceWarning = "Candidate slot has multiple active historical IDL revisions; current finalized PoolState account fields and PDA checks match, but the schema revision is not uniquely pinned to the candidate slot.";
    }
    report.candidateTransactionSlot = candidateTransactionSlot;
    report.candidateTransactionSignature = "2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX";
    report.note = "Finalized current account state is correlated to the preserved candidate CPI vector. This is not a historical account snapshot at the candidate slot and does not prove Jupiter handler slicing or CPI-requested privileges.";
    return report;
  } catch (error) {
    return {
      status: "incomplete",
      commitment: "finalized",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const raydiumLaunchlabCandidateAccountAudit = await auditRaydiumLaunchlabCandidateAccountState();

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
  dexCpiIdlHistory,
  raydiumLaunchlabCandidateAccountAudit,
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
    onChainIdlOwnerMatchesProgram: onChainProvenance.idlAccount?.ownerMatchesJupiterProgram === true,
    onChainIdlPayloadMatchesActiveHistory: onChainProvenance.idlAccount?.decompressedPayloadMatchesActiveHistory === true,
    onChainIdlRouteV2DiscriminatorMatches: onChainProvenance.idlAccount?.decompressedRouteV2Discriminator === expectedRouteV2Discriminator,
    programDataDeploymentCoversCandidateSlot: onChainProvenance.programDataAccount?.deployedAtOrBeforeCandidateSlot === true,
    programDataLoaderOwnerMatches: onChainProvenance.programDataAccount?.loaderOwnerMatches === true,
    dexCpiProgramsWithExactlyOneActiveRevision: dexCpiIdlHistory.filter((item) => item.exactlyOneRevisionCoversCandidateSlot).length,
    dexCpiProgramsWithActiveDiscriminatorMatch: dexCpiIdlHistory.filter((item) => item.activeHistoricalRevisionCount > 0).length,
    dexCpiProgramsWithActiveSchemaAgreement: dexCpiIdlHistory.filter((item) => item.activeSourcesAgreeOnInstructionSchema).length,
    dexCpiProgramsWithLatestHistorySchemaAgreement: dexCpiIdlHistory.filter((item) => item.allLatestAndActiveHistorySchemasAgree).length,
    dexProgramsWithOnChainProgramAccount: dexCpiIdlHistory.filter((item) => item.onChainProvenance.programAccount !== null).length,
    dexProgramsWithUpgradeableLoaderProgramData: dexCpiIdlHistory.filter((item) => item.onChainProvenance.programDataAccount?.loaderOwnerMatches === true).length,
    dexProgramsDeployedAtOrBeforeCandidateSlot: dexCpiIdlHistory.filter((item) => item.onChainProvenance.programDataAccount?.deployedAtOrBeforeCandidateSlot === true).length,
    dexProgramsWithOnChainIdlOwnedByProgram: dexCpiIdlHistory.filter((item) => item.onChainProvenance.idlAccount?.ownerMatchesProgram === true).length,
    dexProgramsWithOnChainIdlInstructionSchemaMatchingHistory: dexCpiIdlHistory.filter((item) => item.onChainProvenance.idlAccount?.instructionSchemaMatchesAnyActiveHistory === true).length,
    dexProgramsWithOnChainIdlPayloadMatchingAnyActiveHistory: dexCpiIdlHistory.filter((item) => item.onChainProvenance.idlAccount?.payloadMatchesAnyActiveHistoricalRevision === true).length,
    dexAdaptersWithSupportedIdlProvenance: dexCpiIdlHistory.filter((item) => item.releaseEvidence.status === "supported").length,
    dexAdaptersWithIncompleteIdlProvenance: dexCpiIdlHistory.filter((item) => item.releaseEvidence.status === "incomplete").length,
    dexAdaptersIncompatibleWithCandidateSlot: dexCpiIdlHistory.filter((item) => item.releaseEvidence.status === "incompatible").length,
    raydiumLaunchlabCandidateAccountAuditStatus: raydiumLaunchlabCandidateAccountAudit.status,
  },
  safetyNote: "Adapter status is an evidence classification scoped to IDL provenance at the candidate transaction slot, not runtime CPI compatibility or release approval. An IDL does not attest to deployed binary identity or prove runtime CPI account slicing, CPI-requested signer/writable privileges, or transaction safety.",
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (summary.assessment.anyHttpOrTransportFailure || !summary.assessment.exactlyOneRevisionCoversCandidateSlot) {
  process.exitCode = 1;
}
