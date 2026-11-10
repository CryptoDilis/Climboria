/**
 * Read-only provenance capture for the canonical Metaplex Token Metadata
 * program on Devnet. ProgramDataState.slot is the last loader modification
 * slot (including ExtendProgram), not necessarily the initial deployment slot.
 * Captures loader history and deployed bytecode SHA-256 without claiming a
 * source match unless a reproducible build artifact is identical.
 */
import { createHash } from "node:crypto";

export const METAPLEX_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const BPF_UPGRADEABLE_LOADER_ID = "BPFLoaderUpgradeab1e11111111111111111111111";
export const METAPLEX_GOVERNANCE_PROGRAM_ID = "mrgTA4fqsDqtvizQBoTMGXosiwruTmu2yXZxmPNLKiJ";
export const PINNED_METAPLEX_BUILD_ARTIFACT = Object.freeze({
  sourceCommit: "7ce760f9e010cb9819ffd7dd86986a44691bd1f8",
  workflowRunId: 42729492423,
  artifactId: 13724730597,
  artifactPath: "programs/.bin/token_metadata.so",
  byteLength: 685688,
  sha256: "d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8",
});

const fail = message => { throw new Error(message); };

export function compareExecutableToPinnedBuildArtifact(executableBytes, {
  artifactLength,
  artifactSha256,
}) {
  const bytes = Buffer.from(executableBytes ?? []);
  if (!Number.isSafeInteger(artifactLength) || artifactLength < 1 ||
      typeof artifactSha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifactSha256)) {
    fail("Pinned build artifact length and SHA-256 are required");
  }
  if (bytes.length < artifactLength) {
    return {
      status: "deployed_program_shorter_than_build_artifact",
      artifactLength,
      deployedLength: bytes.length,
      prefixSha256: null,
      prefixHashMatches: false,
      trailingPaddingLength: 0,
      trailingPaddingIsZero: false,
      exactMatch: false,
    };
  }
  const prefix = bytes.subarray(0, artifactLength);
  const trailing = bytes.subarray(artifactLength);
  const prefixSha256 = createHash("sha256").update(prefix).digest("hex");
  const prefixHashMatches = prefixSha256 === artifactSha256;
  const trailingPaddingIsZero = trailing.every(byte => byte === 0);
  const exactMatch = prefixHashMatches && trailingPaddingIsZero;
  return {
    status: exactMatch
      ? "exact_pinned_artifact_match_with_zero_padding"
      : prefixHashMatches
        ? "artifact_prefix_matches_but_trailing_bytes_are_nonzero"
        : "pinned_artifact_hash_mismatch",
    artifactLength,
    deployedLength: bytes.length,
    prefixSha256,
    prefixHashMatches,
    trailingPaddingLength: trailing.length,
    trailingPaddingIsZero,
    exactMatch,
  };
}

export async function inspectProgramDataStateSlotBlock({
  connection,
  stateSlot,
  programId,
  programDataAddress,
  loaderId = BPF_UPGRADEABLE_LOADER_ID,
}) {
  if (typeof connection?.getBlock !== "function") {
    return { status: "block_rpc_unavailable", stateSlot, candidateTransactions: [] };
  }
  let block;
  try {
    block = await connection.getBlock(stateSlot, {
      commitment: "finalized",
      transactionDetails: "full",
      rewards: false,
      maxSupportedTransactionVersion: 0,
    });
  } catch (error) {
    return {
      status: "state_slot_block_fetch_failed",
      stateSlot,
      reason: String(error.message || error),
      candidateTransactions: [],
    };
  }
  if (!block) return { status: "state_slot_block_unavailable", stateSlot, candidateTransactions: [] };
  const candidates = [];
  for (const entry of block.transactions ?? []) {
    const tx = entry.transaction ?? {};
    const message = tx.message ?? {};
    const keys = message.staticAccountKeys ?? message.accountKeys ?? [];
    const addressAt = value => value?.toBase58?.() ?? value?.pubkey?.toBase58?.() ?? String(value ?? "");
    const addresses = keys.map(addressAt);
    const mentionsTarget = addresses.includes(programDataAddress) || addresses.includes(programId);
    const instructions = message.compiledInstructions ?? message.instructions ?? [];
    let loaderInstructionCount = 0;
    for (const instruction of instructions) {
      const instructionProgramId = instruction.programId
        ? addressAt(instruction.programId)
        : Number.isInteger(instruction.programIdIndex)
          ? addresses[instruction.programIdIndex]
          : "";
      if (instructionProgramId !== loaderId) continue;
      const accountIndexes = instruction.accountKeyIndexes ?? instruction.accounts ?? [];
      const accountAddresses = accountIndexes.map(index =>
        Number.isInteger(index) ? addresses[index] : addressAt(index)
      );
      if (accountAddresses.includes(programDataAddress) || accountAddresses.includes(programId)) {
        loaderInstructionCount += 1;
      }
    }
    if (!mentionsTarget && loaderInstructionCount === 0) continue;
    const firstSignature = tx.signatures?.[0] ?? null;
    candidates.push({
      signature: typeof firstSignature === "string"
        ? firstSignature
        : firstSignature ? Buffer.from(firstSignature).toString("hex") : null,
      referencesProgram: addresses.includes(programId),
      referencesProgramData: addresses.includes(programDataAddress),
      loaderInstructionCount,
      transactionError: entry.meta?.err ?? null,
      relevantLogs: (entry.meta?.logMessages ?? []).filter(line => /upgrade|deploy|programdata|loader/i.test(line)).slice(0, 20),
    });
  }
  return {
    status: "programdata_state_slot_block_inspected",
    stateSlot,
    blockTime: block.blockTime ?? null,
    transactionCount: block.transactions?.length ?? 0,
    candidateTransactions: candidates,
  };
}

async function inspectUpgradeableAccountHistory({
  connection, accountPublicKey, stateSlot, accountLabel, pageSize = 1000, maxPages = 10, maxHistoricalTransactions = 100,
}) {
  if (typeof connection?.getSignaturesForAddress !== "function" ||
      typeof connection?.getTransaction !== "function" || !accountPublicKey ||
      !Number.isSafeInteger(stateSlot) || stateSlot < 1) {
    return { status: `${accountLabel}_history_rpc_unavailable`, signatures: [] };
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 50 ||
      !Number.isSafeInteger(maxHistoricalTransactions) || maxHistoricalTransactions < 1 || maxHistoricalTransactions > 200) {
    throw new Error("Invalid bounded account history scan configuration");
  }
  let before;
  let pagesScanned = 0;
  let signaturesScanned = 0;
  let oldestScannedSlot = null;
  let reachedStateSlot = false;
  const historicalCandidates = [];
  try {
    for (let page = 0; page < maxPages; page++) {
      const options = { limit: pageSize };
      if (before) options.before = before;
      const infos = await connection.getSignaturesForAddress(accountPublicKey, options, "finalized");
      pagesScanned++;
      if (!Array.isArray(infos) || infos.length === 0) break;
      signaturesScanned += infos.length;
      for (const info of infos) {
        if (!Number.isSafeInteger(info.slot)) continue;
        oldestScannedSlot = oldestScannedSlot === null ? info.slot : Math.min(oldestScannedSlot, info.slot);
        if (info.slot <= stateSlot) historicalCandidates.push(info);
      }
      if (oldestScannedSlot !== null && oldestScannedSlot <= stateSlot) {
        reachedStateSlot = true;
        break;
      }
      if (infos.length < pageSize) break;
      const lastSignature = infos[infos.length - 1]?.signature;
      if (!lastSignature || lastSignature === before) break;
      before = lastSignature;
    }
  } catch (error) {
    return { status: `${accountLabel}_history_fetch_failed`, reason: String(error.message || error),
      pagesScanned, signaturesScanned, oldestScannedSlot, reachedStateSlot, signatures: [] };
  }
  // Prefer the oldest signatures in the bounded window: the initial deploy
  // is more likely to be earlier than the recent upgrades and extensions.
  const selectedHistoricalCandidates = historicalCandidates.slice(-maxHistoricalTransactions).reverse();
  const history = [];
  for (let offset = 0; offset < selectedHistoricalCandidates.length; offset += 2) {
    const batch = await Promise.all(selectedHistoricalCandidates.slice(offset, offset + 2).map(async info => {
      let transaction = null;
      let fetchError = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          transaction = await connection.getTransaction(info.signature, {
            commitment: "finalized", maxSupportedTransactionVersion: 0,
          });
          fetchError = null;
          break;
        } catch (error) {
          fetchError = String(error.message || error);
          const rateLimited = /429|too many requests|rate limit/i.test(fetchError);
          if (!rateLimited || attempt === 3) break;
          await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)));
        }
      }
      const logs = transaction?.meta?.logMessages ?? [];
      const message = transaction?.transaction?.message;
      const staticKeys = message?.staticAccountKeys ?? message?.accountKeys ?? [];
      const loaded = transaction?.meta?.loadedAddresses;
      const accountKeys = [...staticKeys, ...(loaded?.writable ?? []), ...(loaded?.readonly ?? [])];
      const signerCount = message?.header?.numRequiredSignatures ?? 0;
      const signerKeys = accountKeys.slice(0, signerCount).map(key => key?.toBase58?.() ?? String(key ?? ""));
      const instructions = message?.compiledInstructions ?? message?.instructions ?? [];
      const instructionEvidence = instructions.map(ix => {
        const programIndex = ix.programIdIndex;
        const accountIndexes = ix.accountKeyIndexes ?? ix.accounts ?? [];
        return {
          programId: ix.programId?.toBase58?.() ?? (Number.isInteger(programIndex) ? accountKeys[programIndex]?.toBase58?.() ?? String(accountKeys[programIndex] ?? "") : null),
          accounts: accountIndexes.map(index => Number.isInteger(index) ? accountKeys[index]?.toBase58?.() ?? String(accountKeys[index] ?? "") : String(index)),
          data: typeof ix.data === "string" ? ix.data : (Buffer.isBuffer(ix.data) || ArrayBuffer.isView(ix.data)) ? Buffer.from(ix.data).toString("base64") : null,
          dataEncoding: typeof ix.data === "string" ? "base58" : (Buffer.isBuffer(ix.data) || ArrayBuffer.isView(ix.data)) ? "base64" : null,
        };
      });
      return {
        signature: info.signature, slot: info.slot,
        blockTime: info.blockTime ?? transaction?.blockTime ?? null,
        transactionAvailable: Boolean(transaction),
        transactionError: transaction?.meta?.err ?? info.err ?? null,
        loaderLogs: logs.filter(line => /upgrade|deploy|programdata|loader|extend/i.test(line)).slice(0, 30),
        governanceLogs: logs.filter(line => /GOVERNANCE-INSTRUCTION|GOVERNANCE-ERROR/i.test(line)).slice(0, 20),
        instructionEvidence,
        signerKeys,
        fetchError,
      };
    }));
    history.push(...batch);
  }
  return {
    status: reachedStateSlot ? `${accountLabel}_state_slot_reached` : `${accountLabel}_history_incomplete`,
    stateSlot, pagesScanned, signaturesScanned, oldestScannedSlot, reachedStateSlot,
    historicalCandidateCount: selectedHistoricalCandidates.length,
    availableHistoricalSignatureCount: historicalCandidates.length,
    selectedRangeOldestSlot: selectedHistoricalCandidates[0]?.slot ?? null,
    selectedRangeNewestSlot: selectedHistoricalCandidates.at(-1)?.slot ?? null,
    signatures: history,
    complete: reachedStateSlot && historicalCandidates.length <= maxHistoricalTransactions,
  };
}

export async function inspectProgramDataHistory({ connection, programDataPublicKey, ...options }) {
  return inspectUpgradeableAccountHistory({
    connection, accountPublicKey: programDataPublicKey, accountLabel: "programdata", ...options,
  });
}

const UPGRADEABLE_LOADER_INSTRUCTION_NAMES = Object.freeze({
  0: "initializeBuffer",
  1: "write",
  2: "deployWithMaxDataLen",
  3: "upgrade",
  4: "setAuthority",
  5: "close",
  6: "extendProgram",
});

export function summarizeUpgradeableLoaderHistory(signatures = []) {
  const events = [];
  const counts = {};
  for (const transaction of signatures) {
    for (const [instructionIndex, instruction] of (transaction.instructionEvidence ?? []).entries()) {
      if (instruction.programId !== BPF_UPGRADEABLE_LOADER_ID ||
          instruction.dataEncoding !== "base64" || typeof instruction.data !== "string") continue;
      const bytes = Buffer.from(instruction.data, "base64");
      if (bytes.length < 4) continue;
      const opcode = bytes.readUInt32LE(0);
      const operation = UPGRADEABLE_LOADER_INSTRUCTION_NAMES[opcode] ?? "unknown";
      counts[operation] = (counts[operation] ?? 0) + 1;
      const accounts = instruction.accounts ?? [];
      const accountRoles = {};
      if (opcode === 2) Object.assign(accountRoles, {
        payer: accounts[0] ?? null, programData: accounts[1] ?? null,
        program: accounts[2] ?? null, buffer: accounts[3] ?? null,
        programAuthority: accounts[7] ?? null,
      });
      if (opcode === 3) Object.assign(accountRoles, {
        programData: accounts[0] ?? null, program: accounts[1] ?? null,
        buffer: accounts[2] ?? null, spill: accounts[3] ?? null,
        upgradeAuthority: accounts[6] ?? null,
      });
      if (opcode === 4) Object.assign(accountRoles, {
        governedAccount: accounts[0] ?? null, currentAuthority: accounts[1] ?? null,
        newAuthority: accounts[2] ?? null,
      });
      if (opcode === 5) Object.assign(accountRoles, {
        closedAccount: accounts[0] ?? null, recipient: accounts[1] ?? null,
        authority: accounts[2] ?? null, program: accounts[3] ?? null,
      });
      if (opcode === 6) Object.assign(accountRoles, {
        programData: accounts[0] ?? null, program: accounts[1] ?? null,
        payer: accounts[3] ?? null,
        additionalBytes: bytes.length >= 8 ? bytes.readUInt32LE(4) : null,
      });
      events.push({
        slot: transaction.slot, signature: transaction.signature, instructionIndex,
        opcode, operation, success: transaction.transactionAvailable === true && transaction.transactionError === null,
        transactionError: transaction.transactionError ?? null,
        signerKeys: transaction.signerKeys ?? [], accountRoles,
      });
    }
  }
  const deployObserved = events.some(event =>
    event.operation === "deployWithMaxDataLen" && event.success);
  return {
    counts,
    deployWithMaxDataLenObserved: deployObserved,
    events,
  };
}

export function summarizeMetaplexGovernanceHistory(signatures = []) {
  const events = [];
  for (const transaction of signatures) {
    for (const instruction of transaction.instructionEvidence ?? []) {
      if (instruction.programId !== METAPLEX_GOVERNANCE_PROGRAM_ID || instruction.dataEncoding !== "base64" || typeof instruction.data !== "string") continue;
      const bytes = Buffer.from(instruction.data, "base64");
      if (bytes.length < 4) continue;
      const discriminator = bytes.readUInt32LE(0);
      const accounts = instruction.accounts ?? [];
      if (discriminator === 5) {
        const log = (transaction.governanceLogs ?? []).find(line => line.includes("CreateProgramGovernance")) ?? "";
        const transferMatch = /transfer_upgrade_authority:\s*(true|false)/.exec(log);
        events.push({ slot: transaction.slot, signature: transaction.signature, instruction: "createProgramGovernance", realm: accounts[0] ?? null, programGovernance: accounts[1] ?? null, governedProgram: accounts[2] ?? null, programData: accounts[3] ?? null, currentUpgradeAuthority: accounts[4] ?? null, tokenOwnerRecord: accounts[5] ?? null, payer: accounts[6] ?? null, createAuthority: accounts[9] ?? null, transferUpgradeAuthority: transferMatch ? transferMatch[1] === "true" : null, success: transaction.transactionAvailable === true && transaction.transactionError === null, transactionError: transaction.transactionError ?? null });
      } else if (discriminator === 16) {
        const isLoader = accounts[3] === BPF_UPGRADEABLE_LOADER_ID;
        events.push({ slot: transaction.slot, signature: transaction.signature, instruction: "executeTransaction", governance: accounts[0] ?? null, proposal: accounts[1] ?? null, proposalTransaction: accounts[2] ?? null, innerProgramId: accounts[3] ?? null, innerProgramData: isLoader ? accounts[4] ?? null : null, innerGovernedProgram: isLoader ? accounts[5] ?? null : null, innerBuffer: isLoader ? accounts[6] ?? null : null, innerUpgradeAuthority: isLoader ? accounts[10] ?? null : null, success: transaction.transactionAvailable === true && transaction.transactionError === null, transactionError: transaction.transactionError ?? null });
      }
    }
  }
  return {
    successfulLoaderUpgradeExecutionCount: events.filter(event =>
      event.instruction === "executeTransaction" &&
      event.innerProgramId === BPF_UPGRADEABLE_LOADER_ID &&
      event.success).length,
    events,
  };
}
export async function inspectGovernanceProposalAccounts({ connection, sdk, governanceHistory, commitment = "finalized" }) {
  const executions = (governanceHistory?.events ?? []).filter(event =>
    event.instruction === "executeTransaction" &&
    event.innerProgramId === BPF_UPGRADEABLE_LOADER_ID &&
    event.success);
  const addresses = [...new Set(executions.flatMap(event => [
    event.governance, event.proposal, event.proposalTransaction,
  ]).filter(Boolean))];
  if (addresses.length === 0) return { status: "no_successful_loader_governance_executions", requestedCount: 0, accounts: [] };
  if (typeof connection?.getMultipleAccountsInfo !== "function" || typeof sdk?.PublicKey !== "function") {
    return { status: "multiple_accounts_rpc_unavailable", requestedCount: addresses.length, accounts: [] };
  }
  try {
    const publicKeys = addresses.map(address => new sdk.PublicKey(address));
    const infos = await connection.getMultipleAccountsInfo(publicKeys, commitment);
    if (!Array.isArray(infos) || infos.length !== addresses.length) {
      return { status: "proposal_account_response_mismatch", requestedCount: addresses.length, returnedCount: Array.isArray(infos) ? infos.length : null, accounts: [] };
    }
    const accounts = infos.map((info, index) => {
      if (!info) return { address: addresses[index], exists: false };
      const data = Buffer.from(info.data ?? []);
      return {
        address: addresses[index],
        exists: true,
        owner: info.owner?.toBase58?.() ?? String(info.owner ?? ""),
        lamports: info.lamports ?? null,
        executable: Boolean(info.executable),
        dataLength: data.length,
        dataSha256: createHash("sha256").update(data).digest("hex"),
        dataBase64: data.toString("base64"),
      };
    });
    return {
      status: "governance_proposal_accounts_captured",
      requestedCount: addresses.length,
      foundCount: accounts.filter(account => account.exists).length,
      commitment,
      accounts,
    };
  } catch (error) {
    return {
      status: "governance_proposal_account_fetch_failed",
      requestedCount: addresses.length,
      reason: String(error.message || error),
      accounts: [],
    };
  }
}

function createGovernanceAccountReader(base64Data, sdk) {
  const bytes = Buffer.from(base64Data, "base64");
  let offset = 0;
  const take = length => {
    if (!Number.isSafeInteger(length) || length < 0 || offset + length > bytes.length) {
      throw new Error("Governance account data ended before the expected Borsh field");
    }
    const value = bytes.subarray(offset, offset + length);
    offset += length;
    return value;
  };
  const u8 = () => take(1).readUInt8(0);
  const u16 = () => take(2).readUInt16LE(0);
  const u32 = () => take(4).readUInt32LE(0);
  const u64 = () => take(8).readBigUInt64LE(0).toString();
  const i64 = () => take(8).readBigInt64LE(0).toString();
  const string = () => {
    const length = u32();
    if (length > 1_000_000) throw new Error("Governance string exceeds the parser safety bound");
    return take(length).toString("utf8");
  };
  const option = readValue => {
    const tag = u8();
    if (tag === 0) return null;
    if (tag !== 1) throw new Error("Invalid Borsh Option tag in governance account");
    return readValue();
  };
  const pubkey = () => {
    const keyBytes = take(32);
    return sdk?.PublicKey ? new sdk.PublicKey(keyBytes).toBase58() : keyBytes.toString("hex");
  };
  return { bytes, take, u8, u16, u32, u64, i64, string, option, pubkey, get offset() { return offset; } };
}

function decodeProposalV2Account(account, sdk) {
  const reader = createGovernanceAccountReader(account.dataBase64, sdk);
  const accountType = reader.u8();
  if (accountType !== 14) throw new Error("Account is not a ProposalV2 account");
  const governance = reader.pubkey();
  const governingTokenMint = reader.pubkey();
  const proposalState = reader.u8();
  const tokenOwnerRecord = reader.pubkey();
  const signatoriesCount = reader.u8();
  const signatoriesSignedOffCount = reader.u8();
  const voteType = reader.u8();
  if (voteType === 1) { reader.u8(); reader.u8(); }
  else if (voteType !== 0) throw new Error("Unknown ProposalV2 vote type");
  const optionCount = reader.u32();
  if (optionCount > 100) throw new Error("Proposal option count exceeds parser safety bound");
  const options = [];
  for (let index = 0; index < optionCount; index++) {
    options.push({
      label: reader.string(),
      voteWeight: reader.u64(),
      voteResult: reader.u8(),
      transactionsExecutedCount: reader.u16(),
      transactionsCount: reader.u16(),
      transactionsNextIndex: reader.u16(),
    });
  }
  reader.option(reader.u64);
  reader.option(reader.u64);
  reader.option(reader.u64);
  reader.option(reader.i64);
  const draftAt = reader.i64();
  const signingOffAt = reader.option(reader.i64);
  const votingAt = reader.option(reader.i64);
  const votingAtSlot = reader.option(reader.u64);
  const votingCompletedAt = reader.option(reader.i64);
  const executingAt = reader.option(reader.i64);
  const closedAt = reader.option(reader.i64);
  const executionFlags = reader.u8();
  reader.option(reader.u64);
  reader.option(reader.u32);
  reader.option(() => ({ type: reader.u8(), value: reader.u8() }));
  reader.take(64);
  const name = reader.string();
  const descriptionLink = reader.string();
  const states = ["Draft", "SigningOff", "Voting", "Succeeded", "Executing", "Completed", "Cancelled", "Defeated", "ExecutingWithErrors"];
  return {
    address: account.address, accountType: "ProposalV2", governance, governingTokenMint,
    state: states[proposalState] ?? "Unknown", stateDiscriminator: proposalState,
    tokenOwnerRecord, signatoriesCount, signatoriesSignedOffCount,
    options, draftAt, signingOffAt, votingAt, votingAtSlot,
    votingCompletedAt, executingAt, closedAt, executionFlags,
    name, descriptionLink, bytesConsumed: reader.offset,
    trailingBytes: reader.bytes.length - reader.offset,
  };
}

function decodeProposalTransactionAccount(account, sdk) {
  const reader = createGovernanceAccountReader(account.dataBase64, sdk);
  const accountType = reader.u8();
  if (accountType !== 8 && accountType !== 13) throw new Error("Account is not a ProposalInstructionV1 or ProposalTransactionV2 account");
  const proposal = reader.pubkey();
  const optionIndex = accountType === 13 ? reader.u8() : null;
  const transactionIndex = accountType === 13 ? reader.u16() : reader.u16();
  const holdUpTime = reader.u32();
  const instructionCount = accountType === 13 ? reader.u32() : 1;
  if (instructionCount > 20) throw new Error("Proposal instruction count exceeds parser safety bound");
  const instructions = [];
  for (let index = 0; index < instructionCount; index++) {
    const programId = reader.pubkey();
    const accountCount = reader.u32();
    if (accountCount > 100) throw new Error("Proposal instruction account count exceeds parser safety bound");
    const accounts = [];
    for (let accountIndex = 0; accountIndex < accountCount; accountIndex++) {
      accounts.push({
        pubkey: reader.pubkey(),
        isSigner: reader.u8() !== 0,
        isWritable: reader.u8() !== 0,
      });
    }
    const dataLength = reader.u32();
    if (dataLength > 100_000) throw new Error("Proposal instruction data exceeds parser safety bound");
    const data = reader.take(dataLength);
    const loaderOpcode = programId === BPF_UPGRADEABLE_LOADER_ID && data.length >= 4
      ? data.readUInt32LE(0) : null;
    instructions.push({
      programId, accounts, dataBase64: data.toString("base64"),
      loaderOpcode, loaderOperation: loaderOpcode === 3 ? "upgrade" : loaderOpcode === 4 ? "setAuthority" : loaderOpcode === 6 ? "extendProgram" : loaderOpcode === 2 ? "deployWithMaxDataLen" : null,
    });
  }
  const executedAt = reader.option(reader.i64);
  const executionStatus = reader.u8();
  if (accountType === 13) reader.take(8);
  return {
    address: account.address,
    accountType: accountType === 13 ? "ProposalTransactionV2" : "ProposalInstructionV1",
    proposal, optionIndex, transactionIndex, holdUpTime, instructions,
    executedAt, executionStatus, bytesConsumed: reader.offset,
    trailingBytes: reader.bytes.length - reader.offset,
  };
}

export function decodeGovernanceProposalAccountEvidence(evidence, sdk) {
  if (evidence?.status !== "governance_proposal_accounts_captured") {
    return {
      status: "governance_proposal_account_evidence_unavailable",
      proposalCount: 0, proposalTransactionCount: 0,
      failures: [], proposals: [], proposalTransactions: [],
    };
  }
  const proposals = [];
  const proposalTransactions = [];
  const failures = [];
  for (const account of evidence?.accounts ?? []) {
    if (!account.exists || typeof account.dataBase64 !== "string") continue;
    try {
      const firstByte = Buffer.from(account.dataBase64, "base64")[0];
      if (firstByte === 14) proposals.push(decodeProposalV2Account(account, sdk));
      else if (firstByte === 8 || firstByte === 13) proposalTransactions.push(decodeProposalTransactionAccount(account, sdk));
    } catch (error) {
      failures.push({ address: account.address, reason: String(error.message || error) });
    }
  }
  return {
    status: failures.length === 0 ? "governance_proposal_accounts_decoded" : "governance_proposal_account_decode_partial",
    proposalCount: proposals.length,
    proposalTransactionCount: proposalTransactions.length,
    failures,
    proposals,
    proposalTransactions,
  };
}

export function verifyGovernanceUpgradeProposalEvidence({
  governanceHistory, proposalDetails, programId = METAPLEX_TOKEN_METADATA_PROGRAM_ID, programDataAddress,
  currentUpgradeAuthority = null,
}) {
  const proposals = new Map((proposalDetails?.proposals ?? []).map(proposal => [proposal.address, proposal]));
  const transactions = new Map((proposalDetails?.proposalTransactions ?? []).map(transaction => [transaction.address, transaction]));
  const executions = (governanceHistory?.events ?? []).filter(event =>
    event.instruction === "executeTransaction" &&
    event.innerProgramId === BPF_UPGRADEABLE_LOADER_ID &&
    event.success);
  const results = executions.map(event => {
    const proposal = proposals.get(event.proposal);
    const transaction = transactions.get(event.proposalTransaction);
    const loaderInstructions = (transaction?.instructions ?? []).filter(instruction =>
      instruction.programId === BPF_UPGRADEABLE_LOADER_ID);
    const loader = loaderInstructions[0];
    const accounts = loader?.accounts ?? [];
    const checks = {
      proposalAccountFound: Boolean(proposal),
      proposalGovernanceMatches: Boolean(proposal && proposal.governance === event.governance),
      governancePdaMatchesCurrentUpgradeAuthority: Boolean(currentUpgradeAuthority && event.governance === currentUpgradeAuthority),
      proposalCompleted: proposal?.state === "Completed",
      proposalTransactionFound: Boolean(transaction),
      proposalTransactionMatches: Boolean(transaction && transaction.proposal === event.proposal),
      transactionExecutionSucceeded: transaction?.executionStatus === 1,
      exactlyOneLoaderInstruction: loaderInstructions.length === 1,
      loaderUpgradeOpcode: loader?.loaderOpcode === 3,
      programDataMatches: accounts[0]?.pubkey === programDataAddress,
      governedProgramMatches: accounts[1]?.pubkey === programId,
      governancePdaIsUpgradeAuthority: accounts[6]?.pubkey === event.governance,
    };
    return {
      slot: event.slot, signature: event.signature,
      proposal: event.proposal, proposalTransaction: event.proposalTransaction,
      proposalName: proposal?.name ?? null, proposalState: proposal?.state ?? null,
      transactionExecutionStatus: transaction?.executionStatus ?? null,
      checks,
      verified: Object.values(checks).every(Boolean),
    };
  });
  const verifiedCount = results.filter(result => result.verified).length;
  return {
    status: executions.length === 0 ? "no_successful_loader_governance_executions"
      : verifiedCount === executions.length ? "all_governance_upgrade_proposals_verified"
      : "governance_upgrade_proposal_verification_partial",
    executionCount: executions.length,
    verifiedCount,
    failedCount: executions.length - verifiedCount,
    results,
  };
}

export async function captureDevnetMetaplexProgramProvenance({ connection, sdk, cluster, buildArtifact = PINNED_METAPLEX_BUILD_ARTIFACT }) {
  if (cluster !== "devnet") fail("Metaplex deployment provenance capture is restricted to Devnet");
  if (!connection || !sdk?.PublicKey || typeof connection.getAccountInfo !== "function") {
    fail("Read-only account RPC and PublicKey support are required");
  }
  const programId = new sdk.PublicKey(METAPLEX_TOKEN_METADATA_PROGRAM_ID);
  const commitment = "finalized";
  const program = await connection.getAccountInfo(programId, commitment);
  if (!program) fail("Canonical Devnet Metaplex Token Metadata program account is missing");
  if (program.owner?.toBase58?.() !== BPF_UPGRADEABLE_LOADER_ID) {
    fail("Metaplex Token Metadata program is not owned by the upgradeable BPF loader");
  }
  if (program.executable !== true) fail("Canonical Devnet Metaplex Token Metadata program is not executable");
  const programData = Buffer.from(program.data ?? []);
  if (programData.length !== 36 || programData.readUInt32LE(0) !== 2) {
    fail("Upgradeable-loader Program account has an unexpected state layout");
  }
  const programDataAddress = new sdk.PublicKey(programData.subarray(4, 36));
  const dataAccount = await connection.getAccountInfo(programDataAddress, commitment);
  if (!dataAccount) fail("Metaplex ProgramData account is missing at finalized commitment");
  if (dataAccount.owner?.toBase58?.() !== BPF_UPGRADEABLE_LOADER_ID) {
    fail("Metaplex ProgramData account is not owned by the upgradeable BPF loader");
  }
  if (dataAccount.executable === true) fail("Metaplex ProgramData account must not be executable");
  const bytes = Buffer.from(dataAccount.data ?? []);
  if (bytes.length < 13 || bytes.readUInt32LE(0) !== 3) {
    fail("Upgradeable-loader ProgramData account has an unexpected state layout");
  }
  const programDataStateSlot = Number(bytes.readBigUInt64LE(4));
  const authorityOption = bytes[12];
  let upgradeAuthority = null;
  let codeOffset;
  if (authorityOption === 0) {
    codeOffset = 13;
  } else if (authorityOption === 1) {
    if (bytes.length < 45) fail("Upgradeable-loader ProgramData authority field is truncated");
    upgradeAuthority = new sdk.PublicKey(bytes.subarray(13, 45)).toBase58();
    codeOffset = 45;
  } else {
    fail("Upgradeable-loader ProgramData authority option is invalid");
  }
  const executableBytes = bytes.subarray(codeOffset);
  if (executableBytes.length === 0) fail("Metaplex ProgramData contains no executable bytecode");
  let programDataStateSlotBlockTimeUnix = null;
  if (typeof connection.getBlockTime === "function") {
    try {
      const blockTime = await connection.getBlockTime(programDataStateSlot);
      if (Number.isSafeInteger(blockTime) && blockTime > 0) programDataStateSlotBlockTimeUnix = blockTime;
    } catch {
      // The slot timestamp is supplementary provenance; account/hash checks remain authoritative.
    }
  }
  const artifactMetadata = {
    sourceCommit: buildArtifact.sourceCommit ?? null,
    workflowRunId: buildArtifact.workflowRunId ?? null,
    artifactId: buildArtifact.artifactId ?? null,
    artifactPath: buildArtifact.artifactPath ?? null,
    byteLength: buildArtifact.byteLength,
    sha256: buildArtifact.sha256,
  };
  const programDataStateSlotBlockEvidence = await inspectProgramDataStateSlotBlock({
    connection,
    stateSlot: programDataStateSlot,
    programId: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programDataAddress: programDataAddress.toBase58(),
  });
  const programDataHistory = await inspectProgramDataHistory({
    connection,
    programDataPublicKey: programDataAddress,
    stateSlot: programDataStateSlot,
  });
  const governanceHistory = summarizeMetaplexGovernanceHistory(programDataHistory.signatures);
  const governanceProposalAccounts = await inspectGovernanceProposalAccounts({
    connection, sdk, governanceHistory, commitment,
  });
  const governanceProposalDetails = decodeGovernanceProposalAccountEvidence(governanceProposalAccounts, sdk);
  const governanceUpgradeVerification = verifyGovernanceUpgradeProposalEvidence({
    governanceHistory, proposalDetails: governanceProposalDetails,
    programId: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programDataAddress: programDataAddress.toBase58(),
    currentUpgradeAuthority: upgradeAuthority,
  });
  const pinnedBuildArtifactComparison = compareExecutableToPinnedBuildArtifact(executableBytes, {
    artifactLength: artifactMetadata.byteLength,
    artifactSha256: artifactMetadata.sha256,
  });
  return {
    status: pinnedBuildArtifactComparison.exactMatch
      ? "deployment_provenance_captured_exact_pinned_build_match"
      : "deployment_provenance_captured_source_match_unverified",
    cluster,
    commitment,
    programId: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programOwner: program.owner.toBase58(),
    executable: program.executable,
    programDataAddress: programDataAddress.toBase58(),
    programDataOwner: dataAccount.owner.toBase58(),
    programDataStateSlot,
    programDataStateSlotBlockTimeUnix,
    programDataStateSlotBlockEvidence,
    programDataHistory,
    programDataLifecycle: summarizeUpgradeableLoaderHistory(programDataHistory.signatures),
    governanceHistory,
    governanceProposalAccounts,
    governanceProposalDetails,
    governanceUpgradeVerification,
    upgradeAuthority,
    immutable: upgradeAuthority === null,
    executableByteLength: executableBytes.length,
    executableSha256: createHash("sha256").update(executableBytes).digest("hex"),
    pinnedBuildArtifact: artifactMetadata,
    pinnedBuildArtifactComparison,
    sourceMatchStatus: pinnedBuildArtifactComparison.exactMatch ? "exact_pinned_build_artifact_match" : "pinned_build_artifact_not_matched",
    transactionSigned: false,
    transactionSimulated: false,
    transactionSubmitted: false,
  };
}
