// SPDX-License-Identifier: Apache-2.0
// Offline correlation of existing key-control proofs with exact issuance review intent.
// This is NOT approval of the plan or evidence that five people control the keys.
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {normalizeChallenge,verifyRoster} from './role-control-evidence.mjs';

const MAX_BYTES=128*1024;
const require=(ok,message)=>{if(!ok)throw Error(message)};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&!/^0+$/.test(v);
const exact=(obj,keys)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
function parsePinned(raw,digest,label){
 require(Buffer.isBuffer(raw)&&raw.length>0&&raw.length<=MAX_BYTES,'invalid '+label+' bytes');
 require(pin(digest)&&hash(raw)===digest,label+' pin mismatch');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
 const value=JSON.parse(text);
 // Only compact JSON.stringify representation accepted. This rejects
 // duplicate names, alternate encodings and trailing data. Reject unsafe
 // numeric values explicitly, even if they serialize identically.
 require(JSON.stringify(value)===text,label+' noncanonical JSON');
 const checkNumbers=v=>{if(typeof v==='number')require(Number.isSafeInteger(v),label+' unsafe number');else if(v&&typeof v==='object')Object.values(v).forEach(checkNumbers)};
 checkNumbers(value);
 return value;
}
function addr(value){
 require(typeof value==='string'&&/^0x[0-9a-f]{40}$/.test(value)&&BigInt(value)>65535n,'invalid plan address');
 return value;
}
export function verifyCustodyPlan({planRaw,planPin,challengeRaw,challengePin,proofsRaw,proofsPin,now=Math.floor(Date.now()/1000)}){
 const plan=parsePinned(planRaw,planPin,'plan');
 const challenge=normalizeChallenge(parsePinned(challengeRaw,challengePin,'challenge'));
 const proofs=parsePinned(proofsRaw,proofsPin,'proofs');
 require(exact(plan,['schema','status','chain_id','source_commit','safe','successor','owners','threshold','payload_sha256','expected_epoch','fields']),'invalid plan shape');
 require(plan.schema===1&&plan.status==='REVIEW_ONLY_NO_GO'&&plan.chain_id===84532&&plan.threshold===3,'wrong plan context');
 require(plan.source_commit===challenge.sourceSha,'source mismatch');
 require(Array.isArray(plan.owners)&&plan.owners.length===5,'wrong owner count');
 const actual=plan.owners.map(addr),expected=challenge.owners.map(o=>o.address);
 require(new Set(actual).size===5&&expected.every(a=>actual.includes(a)),'roster mismatch');
 require(exact(plan.fields,['epoch','valid_after','deadline','founder','distributor','guard','start','gaming_wallet_monthly_cap','quote','builder','lp_custody','tranche_cap']),'invalid plan fields');
 const exclusive=[plan.safe,plan.successor,plan.fields.guard,plan.fields.founder,plan.fields.distributor,plan.fields.lp_custody].map(addr);
 require(new Set(exclusive).size===exclusive.length&&exclusive.every(a=>!actual.includes(a)),'reserved role overlap');
 require(pin(plan.payload_sha256),'invalid payload digest');
 require(Number.isSafeInteger(now)&&Number.isSafeInteger(plan.fields.valid_after)&&Number.isSafeInteger(plan.fields.deadline)&&plan.fields.valid_after<=now&&now<plan.fields.deadline,'plan review window expired or early');
 const result=verifyRoster(challenge,proofs,now);
 return {status:'CUSTODY_KEY_CONTROL_PLAN_CORRELATION_NO_GO',sourceSha:challenge.sourceSha,chainId:84532,
  planSha256:planPin,challengeSha256:challengePin,proofsSha256:proofsPin,rosterSha256:result.rosterSha256,
  verifiedRoles:result.verifiedRoles,threshold:3,testnet:'NO_GO',mainnet:'NO_GO',
  limitations:'Exact externally pinned files and EOA key-control signatures; owners compared as a set. Signatures do not approve the plan or bind its payload, Safe address, nonce, or transaction. No independent human control, pin provenance, chain state, actual issuance calldata, recovery acceptance or release authorization verified. Run the existing integrated runtime gate separately.'};
}
function load(p){const st=statSync(p);require(st.isFile()&&st.size<=MAX_BYTES,'invalid input file');return readFileSync(p)}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  require(process.argv.length===8,'usage');
  const [plan,planPin,challenge,challengePin,proofs,proofsPin]=process.argv.slice(2);
  console.log(JSON.stringify(verifyCustodyPlan({planRaw:load(plan),planPin,challengeRaw:load(challenge),challengePin,proofsRaw:load(proofs),proofsPin}),null,2));
 }catch{console.error('NO_GO: custody plan correlation rejected');process.exitCode=1;}
}
