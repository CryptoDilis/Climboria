// Offline synthetic manifest evidence only. No source RPC, signature, eligibility
// verification, bridge proof, transaction creation or authorization.
import {createHash} from 'node:crypto';
export const RESERVE=8888888880000n;
const DOMAIN='CLIMB_BASE_LEGACY_SYNTHETIC_EVIDENCE_V1';
const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
function requireCondition(ok,message){if(!ok)throw new Error(message);}
function fields(value,keys){
 requireCondition(value!==null&&typeof value==='object'&&!Array.isArray(value),'invalid object');
 requireCondition(Object.keys(value).sort().join(',')===keys.slice().sort().join(','),'unexpected or missing field');
}
function pubkey(value){
 requireCondition(typeof value==='string'&&value.length>=32&&value.length<=44,'invalid source key');
 let n=0n;
 for(const char of value){const i=ALPHABET.indexOf(char);requireCondition(i>=0,'invalid source key');n=n*58n+BigInt(i);}
 let bytes=0;while(n>0n){bytes++;n>>=8n;}
 const leading=value.match(/^1*/)[0].length;
 requireCondition(leading+bytes===32&&bytes>0,'invalid source key');
 return value;
}
function hash(value){requireCondition(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&!/^0+$/.test(value),'invalid evidence digest');return value;}
function uint(value,max){
 requireCondition(typeof value==='string'&&/^[1-9][0-9]{0,19}$/.test(value),'invalid positive integer');
 const n=BigInt(value);requireCondition(n<=max,'integer exceeds bound');return n;
}
function evm(value){requireCondition(typeof value==='string'&&/^0x[0-9a-f]{40}$/.test(value)&&!/^0x0+$/.test(value),'invalid canonical destination');return value;}
const U64=(1n<<64n)-1n;
export function buildLegacyEvidence(input){
 fields(input,['mode','sourceGenesis','sourceMint','snapshotSlot','snapshotHash','policyHash','targetChainId','targetToken','targetVault','campaign','cap','entries']);
 requireCondition(input.mode==='SYNTHETIC_ONLY'&&input.targetChainId===84532,'test-only chain and mode required');
 const sourceGenesis=pubkey(input.sourceGenesis),sourceMint=pubkey(input.sourceMint);
 uint(input.snapshotSlot,U64);hash(input.snapshotHash);hash(input.policyHash);hash(input.campaign);
 const targetToken=evm(input.targetToken),targetVault=evm(input.targetVault);
 requireCondition(targetToken!==targetVault,'destination role collision');
 const cap=uint(input.cap,RESERVE);
 requireCondition(Array.isArray(input.entries)&&input.entries.length>0&&input.entries.length<=100000,'invalid entry count');
 const seen=new Set();let total=0n;
 const entries=input.entries.map(row=>{
  fields(row,['sourceAccount','sourceOwner','recipient','sourceAmount','award','evidenceHash']);
  const sourceAccount=pubkey(row.sourceAccount),sourceOwner=pubkey(row.sourceOwner),recipient=evm(row.recipient);
  requireCondition(!seen.has(sourceAccount),'duplicate source account');seen.add(sourceAccount);
  requireCondition(recipient!==targetToken&&recipient!==targetVault,'reserved destination');
  uint(row.sourceAmount,U64);total+=uint(row.award,cap);requireCondition(total<=cap,'reserve cap exceeded');
  hash(row.evidenceHash);
  return [sourceAccount,sourceOwner,recipient,row.sourceAmount,row.award,row.evidenceHash];
 }).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 const context=[DOMAIN,sourceGenesis,sourceMint,input.snapshotSlot,input.snapshotHash,input.policyHash,84532,targetToken,targetVault,input.campaign,input.cap];
 const digest=sha([context,entries]);
 return {status:'SYNTHETIC_COMMITMENT_ONLY',digest,entryCount:entries.length,allocated:total.toString(),cap:input.cap,unallocated:(cap-total).toString(),sourceAuthenticated:false,authorization:false};
}
