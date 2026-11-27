// Offline EOA key-control evidence only; not independent-human attestation or issuance approval.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {isDisposableRole} from './testnet-preflight.mjs';
const ROLES=['founder','blockchain','game','security','operations'];
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const require=(ok,code)=>{if(!ok)throw Error(code);};
function exact(v,keys){require(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)),'invalid shape');}
function nonzeroHex(v,n){return typeof v==='string'&&v.length===n&&/^[a-f0-9]+$/.test(v)&&!/^0+$/.test(v);}
function address(v){require(typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v)&&BigInt(v)>65535n&&!isDisposableRole(v),'invalid/disposable address');return v.toLowerCase();}
export function normalizeChallenge(c){
 exact(c,['chainId','testOnly','sourceSha','nonce','issuedAt','expiresAt','owners']);
 require(c.chainId===84532&&c.testOnly===true,'testnet only');
 require(nonzeroHex(c.sourceSha,40)&&nonzeroHex(c.nonce,64),'invalid context');
 require(Number.isSafeInteger(c.issuedAt)&&Number.isSafeInteger(c.expiresAt)&&c.issuedAt>0&&c.expiresAt>c.issuedAt&&c.expiresAt-c.issuedAt<=86400,'invalid window');
 require(Array.isArray(c.owners)&&c.owners.length===5,'five owner slots required');
 const owners=c.owners.map((v,i)=>{exact(v,['role','address']);require(v.role===ROLES[i],'role order mismatch');return {role:v.role,address:address(v.address)};});
 require(new Set(owners.map(v=>v.address)).size===5,'duplicate owner');
 return {chainId:84532,testOnly:true,sourceSha:c.sourceSha,nonce:c.nonce,issuedAt:c.issuedAt,expiresAt:c.expiresAt,owners};
}
export function roleMessage(challenge,role){
 const c=normalizeChallenge(challenge),owner=c.owners.find(v=>v.role===role);require(owner,'unknown role');
 return ['Climboria — TESTNET ONLY custody key-control check','This is NOT an issuance, transfer, approval, or Safe transaction.','Chain ID: 84532','Source commit: '+c.sourceSha,'Roster SHA-256: '+hash(JSON.stringify(c)),'Challenge: '+c.nonce,'Issued at: '+c.issuedAt,'Expires at: '+c.expiresAt,'Role: '+owner.role,'Wallet: '+owner.address].join('\n');
}
export function verifyRoster(expected,proofs,now=Math.floor(Date.now()/1000)){
 const c=normalizeChallenge(expected);
 require(Number.isSafeInteger(now)&&now>=c.issuedAt&&now<c.expiresAt,'challenge expired or early');
 require(Array.isArray(proofs)&&proofs.length===5,'five proofs required');
 const seen=new Set();
 for(const p of proofs){
  exact(p,['role','signature']);require(!seen.has(p.role),'duplicate proof');seen.add(p.role);
  const owner=c.owners.find(v=>v.role===p.role);
  require(owner&&typeof p.signature==='string'&&/^0x[0-9a-fA-F]{130}$/.test(p.signature),'invalid proof');
  try{execFileSync('cast',['wallet','verify','--address',owner.address,roleMessage(c,p.role),p.signature],{timeout:10000,stdio:'ignore'});}catch{throw Error('signature verification failed');}
 }
 return {status:'KEY_CONTROL_ONLY_NO_GO',chainId:84532,sourceSha:c.sourceSha,rosterSha256:hash(JSON.stringify(c)),verifiedRoles:ROLES.slice(),remaining:['independent human control and conflict evidence','actual approved exact candidate and role selection','recovery and backup evidence','independent source review','explicit testnet authorization']};
}
// CLI deliberately emits no addresses/signatures, only evidence summary. No RPC or signing.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{require(process.argv.length===4,'usage');const load=p=>JSON.parse(readFileSync(p,'utf8'));console.log(JSON.stringify(verifyRoster(load(process.argv[2]),load(process.argv[3])),null,2));}
 catch{console.error('NO_GO: custody role evidence rejected');process.exitCode=1;}
}
