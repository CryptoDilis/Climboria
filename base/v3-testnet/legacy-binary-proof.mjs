// Synthetic binary V2 generator compatible with V3LegacyProofVerifierFixture.
// No root authorization or source authentication.
import {createHash} from 'node:crypto';
import {normalizeLegacyEvidence} from './legacy-canonical-evidence.mjs';
const H=(...parts)=>createHash('sha256').update(Buffer.concat(parts)).digest();
const json=x=>Buffer.from(JSON.stringify(x),'utf8');
const D=H(Buffer.from('CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2'));
const tag=n=>Buffer.from([n]);
const word=n=>Buffer.from(BigInt(n).toString(16).padStart(64,'0'),'hex');
const hex=b=>'0x'+b.toString('hex');
const raw=s=>Buffer.from(s.replace(/^0x/,''),'hex');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function key(s){let n=0n;for(const ch of s)n=n*58n+BigInt(alphabet.indexOf(ch));return word(n);}
const leaf=(ctx,i,r)=>({hash:H(D,tag(1),ctx,word(i),raw(r.sourceAccount),raw(r.sourceOwner),raw(r.recipient),word(r.sourceAmount),word(r.award),raw(r.evidenceHash)),sum:BigInt(r.award)});
const pad=(ctx,i)=>({hash:H(D,tag(2),ctx,word(i)),sum:0n});
const parent=(l,r)=>({hash:H(D,tag(3),l.hash,word(l.sum),r.hash,word(r.sum)),sum:l.sum+r.sum});
export function buildBinaryLegacyTree(input){
 const {context,entries,total,cap}=normalizeLegacyEvidence(input);
 const ctx=H(json(context)),manifest=H(json([context,entries]));
 const rows=entries.map(r=>({sourceAccount:hex(key(r[0])),sourceOwner:hex(key(r[1])),recipient:r[2],sourceAmount:r[3],award:r[4],evidenceHash:'0x'+r[5]}));
 const count=rows.length,width=2**Math.ceil(Math.log2(count));
 const levels=[Array.from({length:width},(_,i)=>i<count?leaf(ctx,i,rows[i]):pad(ctx,i))];
 while(levels.at(-1).length>1){
  const last=levels.at(-1),next=[];
  for(let i=0;i<last.length;i+=2)next.push(parent(last[i],last[i+1]));
  levels.push(next);
 }
 const top=levels.at(-1)[0];
 if(top.sum!==total)throw Error('sum mismatch');
 const root=H(D,tag(4),ctx,manifest,word(84532),raw(input.targetToken),raw(input.targetVault),word(count),word(cap),top.hash,word(top.sum));
 const commitment={contextHash:hex(ctx),manifestDigest:hex(manifest),targetToken:input.targetToken,targetVault:input.targetVault,count,cap:cap.toString(),allocated:total.toString(),root:hex(root)};
 return {status:'SYNTHETIC_BINARY_PROOF_ONLY',sourceAuthenticated:false,authorization:false,commitment,proof(index){
  if(!Number.isSafeInteger(index)||index<0||index>=count)throw Error('invalid index');
  const siblings=[];let i=index;
  for(let level=0;level<levels.length-1;level++){const n=levels[level][i^1];siblings.push({hash:hex(n.hash),sum:n.sum.toString()});i=Math.floor(i/2);}
  return {index,row:{...rows[index]},siblings};
 }};
}
