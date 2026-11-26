import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verify,matchRuntime,expected,specs} from './verify-creation.mjs';
const word=n=>BigInt(n).toString(16).padStart(64,'0'),sha=x=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
const address=n=>'0x'+n.toString(16).padStart(40,'0');
const token=address(500000),vaults=specs.map((_,i)=>address(500001+i));
const signatures=['decimals()','totalSupply()','INITIAL_SUPPLY()','balanceOf(address)',...specs.map(x=>x[0]+'()'),'purpose()','token()','start()','beneficiary()','ALLOCATION()','released()','vested()','distributor()','excludedFounder()','budget()','totalSpent()','signer(address)'];
const methodIdentifiers=Object.fromEntries(signatures.map((s,i)=>[s,(i+1).toString(16).padStart(8,'0')]));
const template='0x6000',data=template+[expected.founder,expected.distributor,expected.start,...expected.signers].map(word).join('');
const e={...expected,template:sha(template),creation:sha(data)};
const a=Object.fromEntries(['ClimbV3IntegratedTestToken',...specs.map(s=>s[1])].map(n=>[n,{bytecode:{object:template},deployedBytecode:{object:'0x6000',immutableReferences:{}},methodIdentifiers}]));
const block={number:'0x10',hash:'0x'+'a'.repeat(64),timestamp:'0x100'};
const final={...block,number:'0x20',hash:'0x'+'b'.repeat(64)};
const receipt={status:'0x1',transactionHash:e.tx,contractAddress:token,from:e.payer,to:null,blockHash:block.hash,blockNumber:block.number,logs:specs.map((s,i)=>({address:token,removed:false,transactionHash:e.tx,blockHash:block.hash,blockNumber:block.number,topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x'+word(0),'0x'+word(vaults[i])],data:'0x'+word(s[2])}))};
const tx={hash:e.tx,from:e.payer,to:null,value:'0x0',blockNumber:block.number,blockHash:block.hash,input:data};
function mock(change=(m,p,v)=>v){
 return async(url,opts)=>{
  assert.equal(url,'https://sepolia.base.org');const {method:m,params:p}=JSON.parse(opts.body);let v;
  if(m==='eth_chainId')v='0x14a34';
  else if(m==='eth_getBlockByNumber')v=p[0]==='finalized'||p[0]===final.number?final:block;
  else if(m==='eth_getTransactionReceipt')v=receipt;
  else if(m==='eth_getTransactionByHash')v=tx;
  else if(m==='eth_getCode')v='0x6000';
  else if(m==='eth_call'){
   assert.equal(p[1],block.number);
   const {to,data}=p[0],s=signatures.find(s=>methodIdentifiers[s]===data.slice(2,10)),arg='0x'+data.slice(-40),i=vaults.indexOf(to),spec=specs[i];let n;
   if(to===token){
    if(s==='decimals()')n=6;
    else if(s==='totalSupply()'||s==='INITIAL_SUPPLY()')n=888888888000000n;
    else if(s==='balanceOf(address)')n=specs[vaults.indexOf(arg)]?.[2]??0;
    else n=vaults[specs.findIndex(x=>x[0]+'()'===s)];
   }else{
    if(s==='purpose()'){v='0x'+Buffer.from(spec[3]).toString('hex').padEnd(64,'0');}
    else if(s==='token()')n=token;
    else if(s==='start()')n=e.start;
    else if(s==='beneficiary()'||s==='excludedFounder()')n=e.founder;
    else if(s==='distributor()')n=e.distributor;
    else if(s==='ALLOCATION()'||s==='budget()')n=spec[2];
    else if(s==='signer(address)')n=e.signers.includes(arg)?1:0;
    else n=0;
   }
   v??='0x'+word(n);
  }else throw Error('unexpected method');
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:change(m,p,v)})};
 };
}
test('verifies exact creation, seven mint logs and reserve bindings',async()=>{const v=await verify(a,e,mock());assert.equal(v.token,token);assert.equal(v.vaults.length,7);assert.equal(v.supplyRaw,'888888888000000');});
test('rejects not finalized',async()=>assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_getBlockByNumber'&&p[0]==='finalized'?{...v,number:'0xf'}:v)),/NOT_FINALIZED/));
test('rejects incorrect transaction and receipt',async()=>{await assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_getTransactionByHash'?{...v,input:'0x6001'}:v)),/TRANSACTION_MISMATCH/);await assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_getTransactionReceipt'?{...v,status:'0x0'}:v)),/RECEIPT_MISMATCH/);});
test('rejects incorrect mint and state',async()=>{await assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_getTransactionReceipt'?{...v,logs:v.logs.slice(1)}:v)),/MINT_LOG_COUNT/);await assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_call'&&p[0].data==='0x'+methodIdentifiers['totalSupply()']?'0x'+word(1):v)),/STATE_totalSupply/);});
test('normalizes only expected immutable ranges',()=>{const x={deployedBytecode:{object:'0x60'+'00'.repeat(32)+'61',immutableReferences:{a:[{start:1,length:32}]}}};const val=word(12),code='0x60'+val+'61';assert.equal(matchRuntime(x,code,new Set([val])),sha(code));assert.throws(()=>matchRuntime(x,code,new Set()),/IMMUTABLE_VALUE/);assert.throws(()=>matchRuntime(x,'0x60'+val+'62',new Set([val])),/RUNTIME_MISMATCH/);});
test('rejects wrong chain or mutated compiled template',async()=>{await assert.rejects(verify(a,e,mock((m,p,v)=>m==='eth_chainId'?'0x2105':v)),/WRONG_CHAIN/);await assert.rejects(verify(a,{...e,template:'0'.repeat(64)},mock()),/BUILD_HASH/);});
