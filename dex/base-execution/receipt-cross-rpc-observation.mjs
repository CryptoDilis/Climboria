// Opt-in public, read-only RPC corroboration. Matching responses are NOT verified finality.
import {inspectBaseReceiptCandidate} from "./receipt-evidence.mjs";
import {BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
const HOSTS=Object.freeze(["https://mainnet.base.org","https://base-rpc.publicnode.com"]);
const MAX_BYTES=1048576;
const hash=/^0x[0-9a-f]{64}$/;
const address=/^0x[0-9a-f]{40}$/;
const height=/^0x(?:0|[1-9a-f][0-9a-f]{0,15})$/;
async function readJson(response){
 if(!response?.ok)throw Error("Receipt RPC unavailable");
 const reader=response.body?.getReader?.();if(!reader)throw Error("Missing RPC response stream");
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
 if(size>MAX_BYTES){await reader.cancel();throw Error("Receipt RPC response too large");}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
// Compare canonical ordered logs and Base L1 fee in addition to receipt inclusion.
// This checks agreement only; it does not authenticate logs or fee completeness.
const quantity=/^0x(?:0|[1-9a-f][0-9a-f]{0,63})$/;
function receiptDetails(receipt){
 if(typeof receipt.l1Fee!=="string"||!quantity.test(receipt.l1Fee))throw Error("Missing or malformed Base L1 fee");
 if(!Array.isArray(receipt.logs)||receipt.logs.length>512)throw Error("Missing or oversized receipt logs");
 let last=-1n;
 const logs=receipt.logs.map(log=>{
  if(!log||typeof log!=="object"||Array.isArray(log)||log.removed!==false||
   log.transactionHash!==receipt.transactionHash||log.blockHash!==receipt.blockHash||
   log.blockNumber!==receipt.blockNumber||log.transactionIndex!==receipt.transactionIndex||
   typeof log.address!=="string"||!address.test(log.address)||
   typeof log.logIndex!=="string"||!quantity.test(log.logIndex)||
   !Array.isArray(log.topics)||log.topics.length>4||log.topics.some(t=>typeof t!=="string"||!hash.test(t))||
   typeof log.data!=="string"||!/^0x(?:[0-9a-f]{2}){0,32768}$/.test(log.data))throw Error("Malformed or unrelated receipt log");
  const index=BigInt(log.logIndex);
  if(index<=last)throw Error("Duplicate or unordered receipt log index");last=index;
  return [log.logIndex,log.address,log.topics,log.data];
 });
 return [receipt.l1Fee,logs];
}
async function observe(expected,endpoint,fetchImpl,signal){
 let id=0;
 async function rpc(method,params){
  signal.throwIfAborted();const requestId=++id;
  const response=await fetchImpl(endpoint,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",signal,
   headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params})});
  const value=await readJson(response);signal.throwIfAborted();
  if(!value||typeof value!=="object"||Array.isArray(value)||value.jsonrpc!=="2.0"||value.id!==requestId||
    Object.hasOwn(value,"error")||!Object.hasOwn(value,"result"))throw Error("Invalid receipt RPC envelope");
  return value.result;
 }
 const chainId=await rpc("eth_chainId",[]);
 if(chainId!=="0x2105")throw Error("Wrong Base chain");
 const transaction=await rpc("eth_getTransactionByHash",[expected.transactionHash]);
 const receipt=await rpc("eth_getTransactionReceipt",[expected.transactionHash]);
 if(!receipt||typeof receipt.blockNumber!=="string"||!height.test(receipt.blockNumber))throw Error("Missing mined receipt");
 const canonicalBlock=await rpc("eth_getBlockByNumber",[receipt.blockNumber,false]);
 const finalizedBlock=await rpc("eth_getBlockByNumber",["finalized",false]);
 const candidate=inspectBaseReceiptCandidate(expected,{chainId,transaction,receipt,canonicalBlock,finalizedBlock});
 if(await rpc("eth_chainId",[])!==chainId)throw Error("RPC chain changed");
 const finalCanonical=await rpc("eth_getBlockByNumber",[receipt.blockNumber,false]);
 const finalReceipt=await rpc("eth_getTransactionReceipt",[expected.transactionHash]);
 const finalTransaction=await rpc("eth_getTransactionByHash",[expected.transactionHash]);
 const fenced=inspectBaseReceiptCandidate(expected,{chainId,transaction:finalTransaction,receipt:finalReceipt,canonicalBlock:finalCanonical,finalizedBlock});
 const evidenceKey=(candidate,tx,rc)=>JSON.stringify([candidate.blockHash,candidate.blockNumber,rc.transactionIndex,tx.gas,rc.gasUsed,rc.effectiveGasPrice,receiptDetails(rc)]);
 const key=evidenceKey(candidate,transaction,receipt);
 if(key!==evidenceKey(fenced,finalTransaction,finalReceipt))throw Error("Receipt changed during observation");
 return {candidate:fenced,key};
}
export async function corroborateBaseReceipt(expected,{authorized=false,fetchImpl=(url,opts)=>globalThis.fetch(url,opts),signal}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true)throw Error("Explicit read-only receipt opt-in required");
 // Snapshot the caller's intent before asynchronous reads. Only the transaction hash is transmitted.
 if(!expected||expected.chainId!==8453||typeof expected.transactionHash!=="string"||!hash.test(expected.transactionHash)||/^0x0{64}$/.test(expected.transactionHash)||
   typeof expected.from!=="string"||!address.test(expected.from)||/^0x0{40}$/.test(expected.from)||
   typeof expected.to!=="string"||!address.test(expected.to)||/^0x0{40}$/.test(expected.to)||expected.from===expected.to||
   typeof expected.input!=="string"||!/^0x(?:[0-9a-f]{2}){4,32768}$/.test(expected.input))throw Error("Invalid expected receipt intent");
 const snapshot=Object.freeze({chainId:8453,transactionHash:expected.transactionHash,from:expected.from,to:expected.to,input:expected.input});
 const controller=new AbortController(),deadline=AbortSignal.timeout(15000);
 const requestSignal=AbortSignal.any([controller.signal,deadline,...(signal?[signal]:[])]);
 try{
  const [first,second]=await Promise.all(HOSTS.map(host=>observe(snapshot,host,fetchImpl,requestSignal)));
  if(first.key!==second.key)throw Error("Public RPC receipt mismatch");
  requestSignal.throwIfAborted();
  return Object.freeze({chainId:8453,transactionHash:snapshot.transactionHash,blockHash:first.candidate.blockHash,blockNumber:first.candidate.blockNumber,
   rpcHostsCompared:2,reportedReceiptEvidenceMatched:true,reportedLogsAndL1FeeMatched:true,reportedFinalizedHeightsCoverReceipt:true,
   observationOnly:true,executable:false,executionReady:false,receiptFinalityVerified:false,tokenSettlementVerified:false,
   walletAuthorizationVerified:false,providerIndependenceVerified:false,allInFeeVerified:false,operatorFeeVerified:false});
 }finally{controller.abort();}
}
