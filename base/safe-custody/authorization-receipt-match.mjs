// Offline direct-Safe receipt matcher; NOT a signature, finality, or payment verifier.
// The caller must independently establish chain/configuration, calldata and computed IDs,
// historical quorum and canonical finality before using any matched evidence.
const topics=Object.freeze({
 success:'0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e',
 failure:'0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23',
 expense:'0xbb3008fd0e1e9abf493f893faa356efe69cb25543b747a2115d6444e6e0fc6af',
 liquidity:'0x529206a38cfc533e67cb0fef5c9b6d2777642e3adbc4321abd1dcb9f193e23eb'
});
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const shape=(o,keys)=>need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),'EXPECTED_SHAPE');
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const address=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&BigInt(x)>0n;
const bytes=x=>typeof x==='string'&&/^0x(?:[0-9a-f]{2})*$/.test(x);
const quantity=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'QUANTITY');return BigInt(x);};
const word=x=>quantity(x).toString(16).padStart(64,'0');
const nonzeroHash=x=>hash(x)&&BigInt(x)>0n;
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
export function matchAuthorizationReceipt(expected,receipt){
 const e=expected;
 need(e?.kind==='expense'||e?.kind==='liquidity','KIND');
 const common=['kind','chainId','blockNumber','blockHash','transactionHash','safe','safeTxHash','vault','id','epoch','readyAt'];
 shape(e,common.concat(e.kind==='expense'?['evidence','recipient','amount']:['assetAmount','quoteAmount','deadline']));
 need(e.chainId===84532&&quantity(e.blockNumber)>0n&&nonzeroHash(e.blockHash)&&nonzeroHash(e.transactionHash),'ANCHOR');
 need(address(e.safe)&&address(e.vault)&&e.safe!==e.vault&&nonzeroHash(e.safeTxHash)&&nonzeroHash(e.id)&&quantity(e.epoch)>0n&&quantity(e.readyAt)>0n,'CONTEXT');
 let expectedTopics=[topics[e.kind],e.id,'0x'+word(e.epoch)],data;
 if(e.kind==='expense'){
  need(nonzeroHash(e.evidence)&&address(e.recipient)&&quantity(e.amount)>0n,'EXPENSE');
  expectedTopics.push(e.evidence);
  data='0x'+e.recipient.slice(2).padStart(64,'0')+word(e.amount)+word(e.readyAt);
 }else{
  need(quantity(e.assetAmount)>0n&&quantity(e.quoteAmount)>0n&&quantity(e.deadline)>quantity(e.readyAt),'LIQUIDITY');
  data='0x'+word(e.assetAmount)+word(e.quoteAmount)+word(e.readyAt)+word(e.deadline);
 }
 need(receipt?.status==='0x1'&&receipt.to===e.safe&&receipt.blockNumber===e.blockNumber&&receipt.blockHash===e.blockHash&&receipt.transactionHash===e.transactionHash,'RECEIPT_CONTEXT');
 need(Array.isArray(receipt.logs)&&receipt.logs.length>0&&receipt.logs.length<=10000,'LOGS');
 let previous=-1n;const matched=[],success=[];
 for(const l of receipt.logs){
  need(address(l?.address)&&l.removed===false&&l.blockHash===e.blockHash&&l.blockNumber===e.blockNumber&&l.transactionHash===e.transactionHash,'LOG_CONTEXT');
  const index=quantity(l.logIndex);need(index>previous,'LOG_ORDER');previous=index;
  need(Array.isArray(l.topics)&&l.topics.length<=4&&l.topics.every(hash)&&bytes(l.data),'LOG_SHAPE');
  if(l.address===e.safe&&l.topics[0]===topics.failure)throw Error('SAFE_EXECUTION_FAILURE');
  if(l.address===e.safe&&l.topics[0]===topics.success){
   need(eq(l.topics,[topics.success,e.safeTxHash])&&l.data==='0x'+'0'.repeat(64),'SAFE_SUCCESS_MISMATCH');
   success.push(index);
  }
  if(l.address===e.vault&&(l.topics[0]===topics.expense||l.topics[0]===topics.liquidity)){
   need(eq(l.topics,expectedTopics)&&l.data===data,'VAULT_EVENT_MISMATCH');matched.push(index);
  }
 }
 need(matched.length===1&&success.length===1&&matched[0]<success[0],'EVENT_CARDINALITY_OR_ORDER');
 return {status:'RECEIPT_MATCH_ONLY_NO_GO',chainId:e.chainId,blockHash:e.blockHash,transactionHash:e.transactionHash,safeTxHash:e.safeTxHash,id:e.id,logIndex:'0x'+matched[0].toString(16),safeSuccessLogIndex:'0x'+success[0].toString(16)};
}
