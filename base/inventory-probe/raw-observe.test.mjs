import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRawAccount,observeRaw,KEYS,CURVE_AUTH} from './raw-observe.mjs';
import {CLIMB_SOLANA_MINT as M,TOKEN_2022_PROGRAM as P} from '../../token/climb-bridge/mint-inspect.mjs';
import {pubkey} from '../../token/climb-bridge/mint-raw-evidence.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function decode(s){let n=0n;for(const c of s)n=n*58n+BigInt(alphabet.indexOf(c));const h=n.toString(16).padStart(64,'0');return Buffer.from(h,'hex');}
const authority=pubkey(Buffer.alloc(32,8)),row={account:KEYS[0],authority,amountRaw:'100',state:'initialized',delegatePresent:false,closeAuthorityPresent:false};
const wrap=b=>({owner:P,executable:false,data:[b.toString('base64'),'base64']});
function account(){const b=Buffer.alloc(170);decode(M).copy(b,0);decode(authority).copy(b,32);b.writeBigUInt64LE(100n,64);b[108]=1;b[165]=2;b.writeUInt16LE(7,166);return b;}
test('raw candidate layout matches exact mint, authority and amount',()=>{const r=inspectRawAccount(wrap(account()),row);assert.equal(r.amountRaw,'100');assert.equal(r.byteLength,170);assert.match(r.sha256,/^[0-9a-f]{64}$/);assert.equal(inspectRawAccount(wrap(account().subarray(0,165)),row).byteLength,165);});
test('reject inconsistent amount, state, authority and native accounts',()=>{for(const mutate of [b=>b.writeBigUInt64LE(101n,64),b=>b[108]=2,b=>b[32]^=1,b=>b.writeUInt32LE(1,109),b=>b.writeUInt32LE(1,72),b=>b.writeUInt32LE(1,129)]){const b=account();mutate(b);assert.throws(()=>inspectRawAccount(wrap(b),row),/RAW_PARSED_MISMATCH/);}});
test('reject unsupported extensions, malformed options and wrong owner',()=>{const b=account();b.writeUInt16LE(2,166);assert.throws(()=>inspectRawAccount(wrap(b),row),/RAW_ACCOUNT_EXTENSION/);const c=account();c.writeUInt32LE(2,72);assert.throws(()=>inspectRawAccount(wrap(c),row),/RAW_OPTION/);assert.throws(()=>inspectRawAccount({...wrap(account()),owner:authority},row),/RAW_ACCOUNT_OWNER/);});
const k=n=>pubkey(Buffer.alloc(32,n));
function fixture(change=()=>{}){
 const m=Buffer.alloc(166+68+84);m.writeBigUInt64LE(400n,36);m[44]=6;m[45]=1;m[165]=1;m.writeUInt16LE(18,166);m.writeUInt16LE(64,168);decode(M).copy(m,202);m.writeUInt16LE(19,234);m.writeUInt16LE(80,236);decode(M).copy(m,270);
 const parsedMint={owner:P,executable:false,data:{program:'spl-token-2022',parsed:{type:'mint',info:{isInitialized:true,decimals:6,supply:'400',mintAuthority:null,freezeAuthority:null,extensions:[{extension:'metadataPointer'},{extension:'tokenMetadata'}]}}}};
 const parsedAcc={owner:P,executable:false,data:{program:'spl-token-2022',parsed:{type:'account',info:{mint:M,owner:authority,state:'initialized',isNative:false,tokenAmount:{amount:'100',decimals:6},extensions:[{extension:'immutableOwner'}]}}}};
 return async(url,opts)=>{const q=JSON.parse(opts.body);const raw=q.params[1]?.encoding==='base64';let v;switch(q.method){
 case 'getGenesisHash':v=k(1);break;case 'getSlot':v=123;break;
 case 'getMultipleAccounts':assert.deepEqual(q.params[0],[M,...KEYS,CURVE_AUTH]);v={context:{slot:123},value:[raw?wrap(m):parsedMint,...KEYS.map(()=>raw?wrap(account()):parsedAcc),{...wrap(Buffer.from([1])),owner:k(2)}]};break;
 case 'getBlock':v={blockhash:k(3)};break;default:throw Error('unexpected');}
 change(url,q,v);return {ok:true,text:async()=>JSON.stringify({jsonrpc:'2.0',id:1,result:v})};};
}
const run=f=>observeRaw('https://a.example','https://b.example',k(1),f);
test('matching raw and reported block evidence remains custody NO_GO',async()=>{const x=await run(fixture());assert.equal(x.status,'RAW_CANDIDATE_OBSERVATION_NO_GO');assert.equal(x.result.unaccountedRaw,'0');assert.equal(x.result.authority.programOwner,k(2));assert.equal(x.custody,'UNCLASSIFIED');});
test('reject cross-format slot mismatch and dual-provider disagreement',async()=>{await assert.rejects(run(fixture((u,q,v)=>{if(q.params[1]?.encoding==='base64')v.context.slot=124;})),/RAW_CONTEXT_MISMATCH/);await assert.rejects(run(fixture((u,q,v)=>{if(u.includes('b.example')&&q.method==='getBlock')v.blockhash=k(4);})),/RAW_PROVIDER_MISMATCH/);});
