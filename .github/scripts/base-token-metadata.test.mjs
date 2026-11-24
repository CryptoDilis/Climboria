import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BASE_RPC_URL,normalizeContract,decodeDecimals,decodeTokenText,formatTokenUnits,readBaseTokenMetadata,initBaseMetadataInspector} from "../../dex/base-token-metadata.mjs";
const address="0x"+"a".repeat(40);
const w=n=>BigInt(n).toString(16).padStart(64,"0");
const str=s=>{const hex=Buffer.from(s).toString("hex");return "0x"+w(32)+w(hex.length/2)+hex.padEnd(Math.ceil(hex.length/64)*64,"0");};
function mock({chain="0x2105",code="0x6000",mutate}={}) {
 const calls=[];
 const fetchImpl=async(url,options)=>{
  assert.equal(url,BASE_RPC_URL);assert.equal(options.method,"POST");assert.equal(options.credentials,"omit");assert.equal(options.redirect,"error");
  const req=JSON.parse(options.body);calls.push(req);
  const results={eth_chainId:chain,eth_blockNumber:"0xabc",eth_getCode:code};
  const selectors={"0x06fdde03":str("Example"),"0x95d89b41":str("EX"),"0x313ce567":"0x"+w(18)};
  let response={jsonrpc:"2.0",id:req.id,result:req.method==="eth_call"?selectors[req.params[0].data]:results[req.method]};
  if(mutate) response=mutate(response,req);
  return new Response(JSON.stringify(response));
 };
 return {calls,fetchImpl};
}
test("strict contract and ABI decoding",()=>{
 assert.equal(normalizeContract("0x"+"A".repeat(40)),address);
 for(const bad of ["0x"+"0".repeat(40),"USDC","https://example.com",address+"0"]) assert.equal(normalizeContract(bad),null);
 assert.equal(decodeDecimals("0x"+w(0)),0);
 assert.equal(decodeDecimals("0x"+w(256)),null);
 assert.equal(decodeTokenText(str("USDC")),"USDC");
 assert.equal(decodeTokenText(str("bad\u202e")),null);
 assert.equal(decodeTokenText("0x"+w(64)+w(1)+"61".padEnd(64,"0")),null);
 assert.equal(decodeTokenText(str("A").slice(0,-1)+"1"),null);
});
test("RPC reads exact Base contract at one block without wallet or transaction calls",async()=>{
 const {calls,fetchImpl}=mock();
 assert.deepEqual(await readBaseTokenMetadata(address,{fetchImpl}),{address,block:"0xabc",hasCode:true,name:"Example",symbol:"EX",decimals:18});
 assert.deepEqual(calls.map(c=>c.method),["eth_chainId","eth_blockNumber","eth_getCode","eth_call","eth_call","eth_call"]);
 assert.deepEqual(calls[2].params,[address,"0xabc"]);
 for(const c of calls.slice(3)){assert.equal(c.params[0].to,address);assert.equal(c.params[1],"0xabc");assert.deepEqual(Object.keys(c.params[0]),["to","data"]);}
});
test("wrong chain, malformed response, missing code and invalid address",async()=>{
 const wrong=mock({chain:"0x1"});
 await assert.rejects(readBaseTokenMetadata(address,wrong),/Unexpected RPC chain/);assert.equal(wrong.calls.length,1);
 const empty=mock({code:"0x"});assert.equal((await readBaseTokenMetadata(address,empty)).hasCode,false);assert.equal(empty.calls.length,3);
 const malformed=mock({mutate:r=>({...r,id:-1})});await assert.rejects(readBaseTokenMetadata(address,malformed),/Unexpected RPC response/);
 const bad=mock();await assert.rejects(readBaseTokenMetadata("USDC",bad),/valid nonzero/);assert.equal(bad.calls.length,0);
 const oversized=mock({mutate:r=>({...r,result:"x".repeat(140000)})});await assert.rejects(readBaseTokenMetadata(address,oversized),/too large/);
});
test("UI only queries on submit, cancels stale lookup and renders text",async()=>{
 class El {constructor(){this.handlers={};this.children=[];this.value="";this.textContent="";}addEventListener(k,f){this.handlers[k]=f;}replaceChildren(){this.children=[];}append(n){this.children.push(n);}}
 const ids=Object.fromEntries(["baseMetadataForm","baseMetadataContract","baseMetadataStatus","baseMetadataResult"].map(x=>[x,new El()]));
 const doc={getElementById:id=>ids[id],createElement:()=>new El()};
 let calls=0,resume;
 initBaseMetadataInspector(doc,async()=>{calls++;return new Promise(r=>resume=r);});
 assert.equal(calls,0);
 ids.baseMetadataContract.value=address;
 const pending=ids.baseMetadataForm.handlers.submit({preventDefault(){}});
 ids.baseMetadataContract.handlers.input();
 resume({address,block:"0x1",hasCode:true,name:"<img>",symbol:"X",decimals:0});await pending;
 assert.equal(ids.baseMetadataResult.children.length,0);
 const next=ids.baseMetadataForm.handlers.submit({preventDefault(){}});
 resume({address,block:"0x1",hasCode:true,name:"<img>",symbol:"X",decimals:0});await next;
 assert.ok(ids.baseMetadataResult.children.some(x=>x.textContent==="Name: <img>"));
 assert.ok(ids.baseMetadataResult.children.some(x=>x.textContent==="Decimals: 0"));
 const html=readFileSync(new URL("../../dex/index.html",import.meta.url),"utf8");
 assert.ok(html.includes('id="baseMetadataForm"'));assert.ok(html.includes('/dex/base-token-metadata.mjs?v=2'));
});

test("optional public holder balance uses exact ABI and integer arithmetic at same block",async()=>{
 const holder="0x"+"b".repeat(40),raw=123456789012345678901234567890n;
 const provider=mock({mutate:(r,req)=>req.method==="eth_call"&&req.params[0].data.startsWith("0x70a08231")?{...r,result:"0x"+w(raw)}:r});
 const info=await readBaseTokenMetadata(address,{...provider,holder});
 assert.deepEqual(info.balance,{holder,raw:raw.toString(),formatted:"123456789012.34567890123456789"});
 const call=provider.calls.at(-1);
 assert.equal(call.method,"eth_call");assert.deepEqual(call.params,[{to:address,data:"0x70a08231"+holder.slice(2).padStart(64,"0")},"0xabc"]);
 assert.equal(formatTokenUnits(0n,18),"0");assert.equal(formatTokenUnits(1n,18),"0.000000000000000001");assert.equal(formatTokenUnits(10n,0),"10");assert.equal(formatTokenUnits(10n,null),null);
 const bad=mock();await assert.rejects(readBaseTokenMetadata(address,{...bad,holder:"USDC"}),/public Base wallet/);assert.equal(bad.calls.length,0);
 const missing=mock({mutate:(r,req)=>req.method==="eth_call"&&req.params[0].data.startsWith("0x70a08231")?{jsonrpc:"2.0",id:req.id,error:{code:3}}:r});
 assert.deepEqual((await readBaseTokenMetadata(address,{...missing,holder})).balance,{holder,raw:null,formatted:null});
 const noDecimals=mock({mutate:(r,req)=>req.method==="eth_call"&&req.params[0].data==="0x313ce567"?{...r,result:"0x"}:req.method==="eth_call"&&req.params[0].data.startsWith("0x70a08231")?{...r,result:"0x"+w(1)}:r});
 assert.deepEqual((await readBaseTokenMetadata(address,{...noDecimals,holder})).balance,{holder,raw:"1",formatted:null});
});
