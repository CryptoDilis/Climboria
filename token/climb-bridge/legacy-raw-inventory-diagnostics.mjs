// Only fixed public codes; never echo arbitrary provider errors or URLs.
const codes=new Map([
 ['NO_GO: invalid RPC URLs','RPC_CONFIG_INVALID'],
 ['NO_GO: RPC endpoints must use HTTPS without embedded user credentials','RPC_CONFIG_INVALID'],
 ['NO_GO: use two different RPC hostname providers','RPC_CONFIG_NOT_DISTINCT'],
 ['NO_GO: configured genesis must match pinned mainnet reference','GENESIS_CONFIG_MISMATCH'],
 ['NO_GO: wrong source genesis','RPC_GENESIS_MISMATCH'],
 ['NO_GO: invalid finalized head','FINALIZED_HEAD_INVALID'],
 ['NO_GO: exact same-slot RPC candidate unavailable','SAME_SLOT_UNAVAILABLE'],
 ['NO_GO: invalid finalized block or freshness','BLOCK_OR_FRESHNESS_INVALID'],
 ['NO_GO: exact same-slot finalized context required','DUAL_CONTEXT_MISMATCH'],
 ['NO_GO: invalid raw inventory','RAW_INVENTORY_INVALID'],
 ['NO_GO: unexpected mint program or authority','MINT_POLICY_MISMATCH'],
 ['NO_GO: duplicate raw account','DUPLICATE_RAW_ACCOUNT'],
 ['NO_GO: raw account inventory bytes disagree','RAW_INVENTORY_DISAGREEMENT'],
 ...['getGenesisHash','getSlot','getAccountInfo','getProgramAccounts','getBlock'].map(method=>['NO_GO: read-only '+method+' request failed','RPC_METHOD_FAILED_'+method])
]);
// Provider letters refer only to configured endpoint order, not actual identities.
for(const method of ['getGenesisHash','getSlot','getAccountInfo','getProgramAccounts','getBlock']){
 for(const provider of ['A','B']){
  for(const reason of ['TRANSPORT_OR_TIMEOUT','HTTP_400','HTTP_401','HTTP_403','HTTP_404','HTTP_405','HTTP_413','HTTP_429','HTTP_5XX','HTTP_OTHER','BODY_UNAVAILABLE','BODY_READ_FAILED','BODY_LIMIT','INVALID_JSON','INVALID_ENVELOPE','RPC_METHOD_NOT_FOUND','RPC_INVALID_PARAMS','RPC_NODE_UNHEALTHY','RPC_INDEX_EXCLUDED','RPC_MIN_CONTEXT_SLOT','RPC_ERROR_OTHER']){
   codes.set('NO_GO: read-only '+method+' request failed '+provider+' '+reason,'RPC_'+provider+'_'+method+'_'+reason);
  }
 }
}
export function inventoryFailureCode(error){
 return error instanceof Error ? (codes.get(error.message)??'UNCLASSIFIED_FAILURE') : 'UNCLASSIFIED_FAILURE';
}
