// Read-only CLIMB bridge escrow/supply preflight. Not a bridge, signer, deployment tool or audit.
const MAX_U64 = (1n << 64n) - 1n;
const MAX_U256 = (1n << 256n) - 1n;
const BASE_CHAIN_ID = 8453;
const SOLANA_MINT = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
const SPL_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[\da-fA-F]{40}$/;

export function rawAmount(value, bits = 64) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid unsigned decimal amount');
  if (bits !== 64 && bits !== 256) throw new Error('Invalid amount bit-width');
  const num = BigInt(value);
  if (num > (bits === 64 ? MAX_U64 : MAX_U256)) throw new Error('Amount out of range');
  return num;
}

export function requireConfigured(config) {
  if (!config || config.schemaVersion !== 1 || config.status !== 'READY_FOR_READ_ONLY_AUDIT') throw new Error('NO_GO: bridge configuration is not verified');
  if (config.solana?.cluster !== 'mainnet-beta' || config.solana?.mint !== SOLANA_MINT || config.solana?.decimals !== 6 || config.solana?.tokenProgram !== SPL_PROGRAM) throw new Error('NO_GO: unexpected Solana mint/program/decimals');
  if (config.base?.chainId !== BASE_CHAIN_ID || config.base?.decimals !== 6) throw new Error('NO_GO: unexpected Base chain/decimals');
  if (!SOLANA_ADDRESS.test(config.solana?.escrowTokenAccount ?? '')) throw new Error('NO_GO: no verified Solana escrow token account');
  if (!SOLANA_ADDRESS.test(config.solana?.escrowAuthority ?? '')) throw new Error('NO_GO: no verified escrow authority');
  if (!EVM_ADDRESS.test(config.base?.wrappedTokenContract ?? '') || /^0x0{40}$/i.test(config.base.wrappedTokenContract)) throw new Error('NO_GO: no verified Base wrapped-token contract');
  if (!config.bridge?.protocol || config.bridge?.configuredManagerAddresses !== true || !config.bridge?.securityReviewUrl) throw new Error('NO_GO: bridge protocol and security evidence missing');
  if (config.activation?.mainnetEnabled !== false) throw new Error('NO_GO: monitor must never authorize mainnet activation');
  return true;
}

export function checkSupply({originalSupplyRaw, escrowBalanceRaw, wrappedSupplyRaw, solanaDecimals, baseDecimals}) {
  if (solanaDecimals !== 6 || baseDecimals !== 6) throw new Error('NO_GO: token decimals mismatch');
  const original = rawAmount(originalSupplyRaw);
  const escrow = rawAmount(escrowBalanceRaw);
  const wrapped = rawAmount(wrappedSupplyRaw, 256);
  if (escrow > original) throw new Error('NO_GO: escrow balance exceeds original supply');
  if (wrapped > escrow) throw new Error('NO_GO: unbacked wrapped CLIMB detected');
  const unlockedSolana = original - escrow;
  const economicallyClaimable = unlockedSolana + wrapped;
  return {
    verdict: 'PASS_ACCOUNTING_ONLY_NOT_RELEASE_AUTHORIZATION',
    originalSupplyRaw: original.toString(),
    escrowBalanceRaw: escrow.toString(),
    wrappedSupplyRaw: wrapped.toString(),
    unlockedSolanaRaw: unlockedSolana.toString(),
    economicallyClaimableRaw: economicallyClaimable.toString(),
    backingSurplusRaw: (escrow - wrapped).toString(),
    decimals: 6
  };
}

// Two Solana accounts are returned at ONE finalized context slot. No mixed-slot balances.
export function inspectFinalizedSolanaPair(reply, config) {
  if (!Number.isSafeInteger(reply?.context?.slot) || reply.context.slot <= 0 ||
      !Array.isArray(reply?.value) || reply.value.length !== 2) {
    throw new Error('NO_GO: invalid finalized Solana multi-account response');
  }
  const [mintAccount, escrowAccount] = reply.value;
  if (mintAccount?.owner !== SPL_PROGRAM || mintAccount?.data?.program !== 'spl-token' ||
      mintAccount?.data?.parsed?.type !== 'mint') throw new Error('NO_GO: unexpected SPL mint account');
  const mint = mintAccount.data.parsed.info;
  if (mint?.isInitialized !== true || mint.decimals !== 6 ||
      !Object.hasOwn(mint,'mintAuthority') || !Object.hasOwn(mint,'freezeAuthority')) {
    throw new Error('NO_GO: Solana mint/authority metadata invalid or missing');
  }
  if (mint.mintAuthority !== null && !SOLANA_ADDRESS.test(mint.mintAuthority)) throw new Error('NO_GO: invalid mint authority');
  if (mint.freezeAuthority !== null && !SOLANA_ADDRESS.test(mint.freezeAuthority)) throw new Error('NO_GO: invalid freeze authority');
  const originalSupplyRaw = rawAmount(mint.supply).toString();

  if (escrowAccount?.owner !== SPL_PROGRAM || escrowAccount?.data?.program !== 'spl-token' ||
      escrowAccount?.data?.parsed?.type !== 'account') throw new Error('NO_GO: unexpected escrow token account');
  const escrow = escrowAccount.data.parsed.info;
  if (escrow?.mint !== SOLANA_MINT || escrow.owner !== config.solana.escrowAuthority ||
      escrow.state !== 'initialized' || escrow.tokenAmount?.decimals !== 6) {
    throw new Error('NO_GO: escrow mint, authority, state or decimals mismatch');
  }
  // Extra controls are conservative until the selected official bridge proves its custody model.
  if (escrow.delegate != null || escrow.closeAuthority != null ||
      (escrow.delegatedAmount?.amount != null && rawAmount(escrow.delegatedAmount.amount) !== 0n)) {
    throw new Error('NO_GO: unexpected escrow delegate or close authority');
  }
  return {
    slot: reply.context.slot,
    originalSupplyRaw,
    escrowBalanceRaw: rawAmount(escrow.tokenAmount.amount).toString(),
    mintAuthority: mint.mintAuthority,
    freezeAuthority: mint.freezeAuthority
  };
}

// Pin every EVM read to the same finalized Base block number, never 'latest' or 'pending'.
export function inspectBaseFinalizedBlock(block) {
  if (typeof block?.number !== 'string' || !/^0x[\da-fA-F]+$/.test(block.number) ||
      BigInt(block.number) === 0n ||
      typeof block?.hash !== 'string' || !/^0x[\da-fA-F]{64}$/.test(block.hash) ||
      /^0x0{64}$/i.test(block.hash)) {
    throw new Error('NO_GO: Base RPC returned no valid finalized block');
  }
  return {number:block.number, hash:block.hash};
}

function hexUint256(input) {
  if (typeof input !== 'string' || !/^0x[\da-fA-F]{64}$/.test(input)) throw new Error('NO_GO: malformed EVM uint256');
  return BigInt(input).toString();
}

async function rpc(url, method, params, fetchFn) {
  let endpoint;
  try {endpoint = new URL(url);} catch {throw new Error('NO_GO: invalid RPC URL');}
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('NO_GO: RPC URL must use HTTPS without embedded credentials');
  const response = await fetchFn(url, {
    method:'POST',redirect:'error',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000)
  });
  if (!response?.ok) throw new Error('NO_GO: RPC HTTP failure for '+method);
  const data = await response.json();
  if (data?.error || data?.result == null) throw new Error('NO_GO: RPC result unavailable for '+method);
  return data.result;
}

// Cross-chain observations cannot be atomic. Any pass is an accounting screen only.
export async function auditLive(config, solanaRpcUrl, baseRpcUrl, fetchFn = fetch) {
  requireConfigured(config);
  const chainId = await rpc(baseRpcUrl,'eth_chainId',[],fetchFn);
  if (chainId !== '0x2105') throw new Error('NO_GO: RPC is not Base mainnet');
  const block = inspectBaseFinalizedBlock(
    await rpc(baseRpcUrl,'eth_getBlockByNumber',['finalized',false],fetchFn)
  );
  const [mintEscrowReply, code] = await Promise.all([
    rpc(solanaRpcUrl,'getMultipleAccounts',[
      [SOLANA_MINT,config.solana.escrowTokenAccount],
      {encoding:'jsonParsed',commitment:'finalized'}
    ],fetchFn),
    rpc(baseRpcUrl,'eth_getCode',[config.base.wrappedTokenContract,block.number],fetchFn)
  ]);
  if (typeof code !== 'string' || !/^0x[\da-fA-F]+$/.test(code) ||
      /^0x0*$/i.test(code)) throw new Error('NO_GO: Base contract has no bytecode');
  const solana = inspectFinalizedSolanaPair(mintEscrowReply,config);
  const address = config.base.wrappedTokenContract;
  const [decimalsHex, supplyHex] = await Promise.all([
    rpc(baseRpcUrl,'eth_call',[{to:address,data:'0x313ce567'},block.number],fetchFn),
    rpc(baseRpcUrl,'eth_call',[{to:address,data:'0x18160ddd'},block.number],fetchFn)
  ]);
  if (hexUint256(decimalsHex) !== '6') throw new Error('NO_GO: wrapped token decimals mismatch');
  const supply = checkSupply({
    originalSupplyRaw:solana.originalSupplyRaw,
    escrowBalanceRaw:solana.escrowBalanceRaw,
    wrappedSupplyRaw:hexUint256(supplyHex),
    solanaDecimals:6,
    baseDecimals:6
  });
  return {
    ...supply,
    solanaFinalizedSlot:solana.slot,
    baseFinalizedBlockNumber:block.number,
    baseFinalizedBlockHash:block.hash,
    observedMintAuthority:solana.mintAuthority,
    observedFreezeAuthority:solana.freezeAuthority,
    caveat:'Read-only non-atomic finalized snapshots; not evidence of bridge manager custody, authenticated messages, deployed route, solvency across all chains, or release authorization'
  };
}
