// Offline membership and allocation-sum proof prototype only.
// A trusted expected commitment is REQUIRED; a proof cannot authenticate a Solana snapshot.
import {createHash} from 'node:crypto';
import {normalizeLegacyEvidence,RESERVE} from './legacy-canonical-evidence.mjs';
const H=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
const DOMAIN='CLIMB_BASE_LEGACY_SUM_TREE_SYNTHETIC_V1';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const integer=(x,max=RESERVE)=>{
 check(typeof x==='string'&&/^(0|[1-9][0-9]{0,12})$/.test(x),'invalid sum');
 const n=BigInt(x);check(n<=max,'sum exceeds bound');return n;
};
const leaf=(ctx,index,row)=>({hash:H([DOMAIN,'leaf',ctx,index,row]),sum:row[4]});
const empty=(ctx,index)=>({hash:H([DOMAIN,'empty',ctx,index]),sum:'0'});
function parent(left,right){
 const sum=integer(left.sum)+integer(right.sum);check(sum<=RESERVE,'tree sum exceeds reserve');
 return {hash:H([DOMAIN,'node',left.hash,left.sum,right.hash,right.sum]),sum:sum.toString()};
}
const depth=n=>Math.ceil(Math.log2(n));
const commitment=(ctx,manifest,count,cap,node)=>H([DOMAIN,'root',ctx,manifest,count,cap,node.hash,node.sum]);
export function buildLegacyProofTree(input){
 const {context,entries,total,cap}=normalizeLegacyEvidence(input);
 const contextHash=H(context),manifestDigest=H([context,entries]),entryCount=entries.length;
 const width=2**depth(entryCount);
 const levels=[Array.from({length:width},(_,i)=>i<entryCount?leaf(contextHash,i,entries[i]):empty(contextHash,i))];
 while(levels.at(-1).length>1){
  const last=levels.at(-1),next=[];
  for(let i=0;i<last.length;i+=2)next.push(parent(last[i],last[i+1]));
  levels.push(next);
 }
 const root=levels.at(-1)[0];
 check(root.sum===total.toString(),'allocation reconciliation failed');
 const expected={status:'SYNTHETIC_PROOF_ONLY',contextHash,manifestDigest,entryCount,cap:cap.toString(),allocated:root.sum,root:commitment(contextHash,manifestDigest,entryCount,cap.toString(),root),sourceAuthenticated:false,authorization:false};
 function proof(index){
  check(Number.isSafeInteger(index)&&index>=0&&index<entryCount,'invalid proof index');
  const siblings=[];let i=index;
  for(let level=0;level<levels.length-1;level++){siblings.push({...levels[level][i^1]});i=Math.floor(i/2);}
  return {index,row:[...entries[index]],siblings};
 }
 return {expected,proof};
}
export function verifyLegacyProof(expected,proof){
 try{
  check(expected.status==='SYNTHETIC_PROOF_ONLY'&&expected.sourceAuthenticated===false&&expected.authorization===false,'test-only evidence required');
  const {contextHash,manifestDigest,entryCount,cap,allocated,root}=expected;
  check(hash(contextHash)&&hash(manifestDigest)&&hash(root),'invalid commitment');
  check(Number.isSafeInteger(entryCount)&&entryCount>0&&entryCount<=100000,'invalid count');
  const max=integer(cap),sum=integer(allocated,max);
  check(max>0n&&sum>0n,'empty allocation');
  const {index,row,siblings}=proof;
  check(Number.isSafeInteger(index)&&index>=0&&index<entryCount,'invalid proof index');
  check(Array.isArray(row)&&row.length===6&&row.every(x=>typeof x==='string'),'invalid row');
  check(integer(row[4],max)>0n,'invalid award');
  check(Array.isArray(siblings)&&siblings.length===depth(entryCount),'invalid proof length');
  let node=leaf(contextHash,index,row),i=index;
  for(const sibling of siblings){
   check(sibling&&hash(sibling.hash),'invalid sibling');integer(sibling.sum,max);
   node=i%2===0?parent(node,sibling):parent(sibling,node);i=Math.floor(i/2);
  }
  return node.sum===allocated&&commitment(contextHash,manifestDigest,entryCount,cap,node)===root;
 }catch{return false;}
}
