// Read-only CLIMB cross-chain supply safety monitor. Does not bridge or sign transactions.
// IMPORTANT: A passing result is a necessary accounting condition, NOT a bridge security audit.
const MAX_U64 = (1n << 64n) - 1n;
const MAX_U256 = (1n << 256n) - 1n;
const BASE_CHAIN_ID = 8453;
const SOLANA_MINT = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
const SPL_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export function rawAmount(value, bits = 64) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid unsigned decimal amount');
  const num = BigInt(value);
  if (num > (bits === 64 ? MAX_U64 : MAX_U256)) throw new Error('Amount out of range');
  return num;
}

export function requireConfigured(config) {
  if (!config || config.schemaVersion !== 1 || config.status !== 'READY_FOR_READ_ONLY_AUDIT') throw new Error('NO_GO: bridge configuration is not verified');
  if (config.solana?.cluster !== 'mainnet-beta' || config.solana?.mint !== SOLANA_MINT || config.solana?.decimals !== 6 || config.solana?.tokenProgram !== SPL_PROGRAM) throw new Error('NO_GO: unexpected Solana mint/program/decimals');
  if (config.base?.chainId !== BASE_CHAIN_ID || config.base?.decimals !== 6) throw new Error('NO_GO: unexpected Base chain/decimals');
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(config.solana?.escrowTokenAccount ?? '')) throw new Error('NO_GO: no verified Solana escrow token account');
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(config.solana?.escrowAuthority ?? '')) throw new Error('NO_GO: no verified escrow authority');
  if (!/^0x[\da-fA-F]{40}$/.test(config.base?.wrappedTokenContract ?? '') || /^0x0{40}$/i.test(config.base.wrappedTokenContract)) throw new Error('NO_GO: no verified Base wrapped-token contract');
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
  // Original supply already includes escrow balance. Do NOT add wrapped to original.
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

async function rpc(url, method, params, timeoutMs = 10000) {
  if (!/^https:\/\//.test(url)) throw new Error('RPC URL must use HTTPS');
  const response = await fetch(url, { method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error('RPC HTTP ' + response.status + ' for ' + method);
  const data = await response.json();
  if (data.error || data.result === undefined || data.result === null) throw new Error('RPC error for ' + method);
  return data.result;
}

function parsedAccount(result, label) {
  if (!result?.value?.data?.parsed?.info || !result.value.owner) throw new Error('NO_GO: malformed ' + label + ' account');
  return result.value;
}

function hexUint256(input) {
  if (typeof input !== 'string' || !/^0x[\da-fA-F]{64}$/.test(input)) throw new Error('NO_GO: malformed EVM uint256');
  return BigInt(input).toString();
}

// Queries finalized Solana state and a Base RPC, but two independent chains cannot be read atomically.
// Use repeated observations and bridge event reconciliation before any public operational claim.
export async function auditLive(config, solanaRpcUrl, baseRpcUrl) {
  requireConfigured(config);
  const chainId = await rpc(baseRpcUrl, 'eth_chainId', []);
  if (chainId !== '0x2105') throw new Error('NO_GO: RPC is not Base mainnet');
  const code = await rpc(baseRpcUrl, 'eth_getCode', [config.base.wrappedTokenContract, 'latest']);
  if (!/^0x[\da-fA-F]+$/.test(code) || code === '0x' || code === '0x0' || /^0x0+$/.test(code)) throw new Error('NO_GO: Base contract has no bytecode');

  const mintAccount = parsedAccount(await rpc(solanaRpcUrl, 'getAccountInfo', [SOLANA_MINT, {encoding:'jsonParsed', commitment:'finalized'}]), 'mint');
  if (mintAccount.owner !== SPL_PROGRAM || mintAccount.data.parsed.type !== 'mint') throw new Error('NO_GO: unexpected mint owner/type');
  const mint = mintAccount.data.parsed.info;
  if (mint.decimals !== 6 || mint.isInitialized !== true) throw new Error('NO_GO: invalid Solana mint metadata');

  const escrowAccount = parsedAccount(await rpc(solanaRpcUrl, 'getAccountInfo', [config.solana.escrowTokenAccount, {encoding:'jsonParsed', commitment:'finalized'}]), 'escrow');
  if (escrowAccount.owner !== SPL_PROGRAM || escrowAccount.data.parsed.type !== 'account') throw new Error('NO_GO: unexpected escrow token account');
  const escrow = escrowAccount.data.parsed.info;
  if (escrow.mint !== SOLANA_MINT || escrow.owner !== config.solana.escrowAuthority || escrow.state !== 'initialized') throw new Error('NO_GO: escrow not controlled by expected bridge authority');
  if (escrow.tokenAmount?.decimals !== 6) throw new Error('NO_GO: escrow decimals mismatch');

  const address = config.base.wrappedTokenContract;
  const baseDecimals = await rpc(baseRpcUrl, 'eth_call', [{to:address, data:'0x313ce567'},'latest']);
  if (hexUint256(baseDecimals) !== '6') throw new Error('NO_GO: wrapped token decimals mismatch');
  const wrappedSupplyRaw = hexUint256(await rpc(baseRpcUrl, 'eth_call', [{to:address, data:'0x18160ddd'},'latest']));
  const supply = checkSupply({originalSupplyRaw:mint.supply, escrowBalanceRaw:escrow.tokenAmount.amount, wrappedSupplyRaw, solanaDecimals:mint.decimals, baseDecimals:6});
  return {...supply, caveat:'Read-only observation across non-atomic chain snapshots; not proof of escrow program security or a deployment authorization'};
}
