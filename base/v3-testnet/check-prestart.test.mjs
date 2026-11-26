import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkPrestart,errors} from './check-prestart.mjs';
import {expected,specs} from './verify-creation.mjs';
const block={number:'0x3d0744b',hash:'0x594ef6e177bb098f57a9a8c0c759c7c2d61419717cfa9c3075f89f3a62d60eb7',timestamp:'0x100'};
const final={...block,number:'0x3d19ca3',hash:'0x'+'b'.repeat(64)};
const code='0x6000',digest=createHash('sha256').update(Buffer.from(code.slice(2),'hex')).digest('hex');
const selectors=Object.fromEntries(errors.map((s,i)=>[s,'0x'+(i+1).toString(16).padStart(8,'0')]));
const methods=['release()','release(uint256)','execute(bytes32)','propose(address,uint256,bytes32,uint256,bytes32)'];
const methodIdentifiers=Object.fromEntries(methods.map((s,i)=>[s,(i+100).toString(16).padStart(8,'0')]));
const abi=errors.map(s=>({type:'error',name:s.slice(0,-2),inputs:[]}));
const artifacts=Object.fromEntries(specs.map(s=>[s[1],{methodIdentifiers,abi}]));
const evidence={status:'V3_TEST_ONLY_FINALIZED_CREATION_OBSERVATION_NO_GO',chainId:84532,token:'0x048361d2344a6b3bbb0aef04508f10038510d237',transaction:expected.tx,creationSha256:expected.creation,deploymentBlock:block.number,blockHash:block.hash,vaults:specs.map((s,i)=>({getter:s[0],type:s[1],allocationRaw:s[2].toString(),address:'0x'+(i+100).toString(16).padStart(40,'0'),runtimeSha256:digest}))};
function mock(change=(m,p,d)=>d){
 return async(url,o)=>{
  assert.equal(url,'https://sepolia.base.org');
  const {method:m,params:p}=JSON.parse(o.body);let d;
  if(m==='eth_chainId')d={result:'0x14a34'};
  else if(m==='eth_getBlockByNumber')d={result:p[0]==='finalized'||p[0]===final.number?final:block};
  else if(m==='eth_getCode')d={result:code};
  else if(m==='eth_call'){
   assert.equal(p[1],block.number);const s=methods.find(s=>methodIdentifiers[s]===p[0].data.slice(2,10));
   const err=s==='release()'?'NothingDue()':s==='release(uint256)'?(p[0].from===expected.distributor?'OutsideWindow()':'NotDistributor()'):s==='execute(bytes32)'?'NotReady()':'Unauthorized()';
   d={error:{code:3,data:selectors[err]}};
  }else throw Error('unexpected');
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,...change(m,p,d)})};
 };
}
test('matches nine exact historical negative calls',async()=>{const r=await checkPrestart(artifacts,evidence,selectors,mock());assert.equal(r.observations.length,9);});
test('rejects generic RPC error and unexpected success',async()=>{for(const d of [{error:{code:-32000,message:'rate limit'}},{result:'0x'}])await assert.rejects(checkPrestart(artifacts,evidence,selectors,mock((m,p,v)=>m==='eth_call'?d:v)),/EXPECTED_REVERT/);});
test('rejects wrong custom error',async()=>assert.rejects(checkPrestart(artifacts,evidence,selectors,mock((m,p,v)=>m==='eth_call'?{error:{code:3,data:'0xdeadbeef'}}:v)),/EXPECTED_REVERT/));
test('rejects wrong chain, unfinalized and post-start blocks',async()=>{for(const [patch,reason] of [[(m,p,v)=>m==='eth_chainId'?{result:'0x2105'}:v,/WRONG_CHAIN/],[(m,p,v)=>m==='eth_getBlockByNumber'&&p[0]==='finalized'?{result:{...final,number:'0x1'}}:v,/NOT_FINALIZED/],[(m,p,v)=>m==='eth_getBlockByNumber'&&p[0]===block.number?{result:{...block,timestamp:'0x'+expected.start.toString(16)}}:v,/NOT_PRESTART/]])await assert.rejects(checkPrestart(artifacts,evidence,selectors,mock(patch)),reason);});
test('rejects evidence mismatch and changed runtime',async()=>{await assert.rejects(checkPrestart(artifacts,{...evidence,token:'0x0'},selectors,mock()),/EVIDENCE_MISMATCH/);await assert.rejects(checkPrestart(artifacts,evidence,selectors,mock((m,p,v)=>m==='eth_getCode'?{result:'0x6001'}:v)),/VAULT_RUNTIME/);});
test('rejects block hash change on recheck',async()=>{let n=0;await assert.rejects(checkPrestart(artifacts,evidence,selectors,mock((m,p,v)=>m==='eth_getBlockByNumber'&&p[0]===block.number&&++n===2?{result:{...block,hash:final.hash}}:v)),/BLOCK_RECHECK/);});
