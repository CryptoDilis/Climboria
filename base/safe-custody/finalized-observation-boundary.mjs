// Offline comparison of two separately collected RPC observations, NOT authenticated
// consensus finality, state proofs, provider independence, or permission to spend.
// Deliberately reject blocks whose transaction pre-state cannot be inferred from
// a single-transaction local model; public Base system transitions remain unverified.
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x)&&BigInt(x)>0n;
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&BigInt(x)>0n;
const q=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'QUANTITY');return BigInt(x);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function header(b){
 need(hash(b?.hash)&&hash(b.parentHash)&&hash(b.stateRoot)&&hash(b.receiptsRoot)&&hash(b.transactionsRoot),'HEADER_HASH');
 need(q(b.number)>0n&&q(b.timestamp)>0n,'HEADER_QUANTITY');
 return {number:b.number,hash:b.hash,parentHash:b.parentHash,stateRoot:b.stateRoot,receiptsRoot:b.receiptsRoot,transactionsRoot:b.transactionsRoot,timestamp:b.timestamp};
}
function normalize(o,e){
 need(o?.chainId==='0x14a34','CHAIN');
 const b=header(o.block),p=header(o.parent),f=header(o.finalized),b2=header(o.blockRecheck),p2=header(o.parentRecheck),f2=header(o.finalizedRecheck);
 need(eq(b,b2)&&eq(p,p2)&&eq(f,f2),'OBSERVATION_CHANGED');
 need(b.hash===e.blockHash&&b.number===e.blockNumber,'ANCHOR');
 need(p.hash===b.parentHash&&q(p.number)+1n===q(b.number)&&q(p.timestamp)<=q(b.timestamp),'PARENT');
 need(q(f.number)>=q(b.number)&&q(f.timestamp)>=q(b.timestamp),'NOT_REPORTED_FINALIZED');
 if(f.number===b.number)need(eq(f,b),'FINALIZED_ANCHOR_MISMATCH');
 // No claim that a later finalized header descends from b: no ancestry proof here.
 const list=o.block.transactions;
 need(Array.isArray(list)&&list.length===1&&list[0]===e.transactionHash,'AMBIGUOUS_PRESTATE');
 need(Array.isArray(o.blockRecheck.transactions)&&eq(o.blockRecheck.transactions,list),'TRANSACTION_LIST_CHANGED');
 const t=o.transaction,r=o.receipt;
 need(t?.hash===e.transactionHash&&t.blockHash===b.hash&&t.blockNumber===b.number&&t.transactionIndex==='0x0'&&t.to===e.safe&&t.value==='0x0','TRANSACTION');
 need(typeof t.input==='string'&&/^0x(?:[0-9a-f]{2})+$/.test(t.input)&&t.input.length<=2000,'INPUT');
 need(r?.transactionHash===t.hash&&r.blockHash===b.hash&&r.blockNumber===b.number&&r.transactionIndex==='0x0'&&r.to===t.to&&r.status==='0x1','RECEIPT');
 need(Array.isArray(r.logs)&&r.logs.length>0&&r.logs.length<=10000,'LOGS');
 let prior=-1n;
 const logs=r.logs.map(l=>{
  need(addr(l?.address)&&l.blockHash===b.hash&&l.blockNumber===b.number&&l.transactionHash===t.hash&&l.transactionIndex==='0x0'&&l.removed===false,'LOG_CONTEXT');
  const n=q(l.logIndex);need(n>prior,'LOG_ORDER');prior=n;
  need(Array.isArray(l.topics)&&l.topics.length<=4&&l.topics.every(x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x))&&typeof l.data==='string'&&/^0x(?:[0-9a-f]{2})*$/.test(l.data),'LOG_SHAPE');
  return {address:l.address,topics:l.topics.slice(),data:l.data,logIndex:l.logIndex};
 });
 return {block:b,parent:p,finalized:f,transaction:{hash:t.hash,to:t.to,input:t.input},logs};
}
export function compareFinalizedObservations(expected,observations){
 const e=expected;
 need(e?.chainId===84532&&hash(e.blockHash)&&hash(e.transactionHash)&&addr(e.safe)&&q(e.blockNumber)>1n,'EXPECTED');
 need(Array.isArray(observations)&&observations.length===2,'TWO_OBSERVATIONS_REQUIRED');
 // These are caller-provided labels, not proof of independent infrastructure.
 need(observations.every(o=>typeof o?.provider==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(o.provider))&&observations[0].provider!==observations[1].provider,'PROVIDER_LABELS');
 const a=normalize(observations[0],e),b=normalize(observations[1],e);
 need(eq(a,b),'PROVIDER_DISAGREEMENT');
 return {status:'DUAL_REPORTED_FINALIZED_OBSERVATION_ONLY_NO_GO',chainId:84532,blockNumber:a.block.number,blockHash:a.block.hash,parentBlockHash:a.parent.hash,reportedFinalizedBlockHash:a.finalized.hash,transactionHash:a.transaction.hash,transactionIndex:'0x0',providerLabels:observations.map(o=>o.provider),authenticatedFinality:false,authenticatedPrestate:false,releaseAuthorized:false};
}
