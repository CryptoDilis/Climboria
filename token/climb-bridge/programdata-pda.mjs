// Read-only ProgramData PDA derivation; no signing or RPC.
// Solana v1.18.26 sdk/program/src/pubkey.rs: SHA256(seeds || loader || marker),
// descending bump 255..1, reject compressed Edwards points.
import {createHash} from 'node:crypto';
import {pubkey} from './mint-raw-evidence.mjs';
export const LOADER='BPFLoaderUpgradeab1e11111111111111111111111';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=()=>{throw new Error('NO_GO: ProgramData PDA derivation failed');};
export function decodeKey(s){
 if(typeof s!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s))fail();
 let n=0n;for(const c of s)n=n*58n+BigInt(alphabet.indexOf(c));
 const hex=n===0n?'':n.toString(16).padStart(Math.ceil(n.toString(16).length/2)*2,'0');
 const b=Buffer.concat([Buffer.alloc(s.match(/^1*/)[0].length),Buffer.from(hex,'hex')]);
 if(b.length!==32||pubkey(b)!==s)fail();return b;
}
const P=(1n<<255n)-19n;
const mod=n=>((n%P)+P)%P;
function pow(a,e){let r=1n;a=mod(a);while(e){if(e&1n)r=mod(r*a);a=mod(a*a);e>>=1n;}return r;}
const D=mod(-121665n*pow(121666n,P-2n));
// For Edwards25519, x^2=(y^2-1)/(d*y^2+1). A square (including zero)
// means a decompressible point. Reject ambiguous noncanonical encodings rather
// than accepting any address in a corner case of the upstream decompressor.
export function onEdwards(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==32)fail();
 let y=0n;for(let i=31;i>=0;i--)y=(y<<8n)|BigInt(i===31?bytes[i]&127:bytes[i]);
 if(y>=P)fail();
 const y2=mod(y*y),den=mod(D*y2+1n);
 if(den===0n)fail();
 const x2=mod((y2-1n)*pow(den,P-2n));
 return x2===0n||pow(x2,(P-1n)/2n)===1n;
}
export function deriveProgramData(program){
 const seed=decodeKey(program),loader=decodeKey(LOADER);
 for(let bump=255;bump>0;bump--){
  const digest=createHash('sha256').update(seed).update(Buffer.from([bump])).update(loader).update('ProgramDerivedAddress').digest();
  if(!onEdwards(digest))return {address:pubkey(digest),bump,bytes:digest};
 }
 fail();
}
