import test from "node:test";
import assert from "node:assert/strict";
import {baseAccount,initBaseWallet} from "../../dex/base-wallet-session.mjs";
const account="0x1234567890123456789012345678901234567890";
class El{constructor(){this.disabled=false;this.textContent="";this.handlers={};}addEventListener(event,fn){this.handlers[event]=fn;}}
function fixture({chain="0x2105",accounts=[account],requestHook,missing=false}={}){
 const nodes=Object.fromEntries(["Connect","Disconnect","Status","Address"].map(k=>["baseWallet"+k,new El()]));
 const calls=[],listeners=new Map();
 const provider={async request({method,...rest}){calls.push(method);assert.deepEqual(rest,{});if(requestHook)return requestHook(method);if(method==="eth_chainId")return chain;if(method==="eth_requestAccounts")return accounts;throw Error("Forbidden RPC");},on(event,fn){listeners.set(event,fn);},removeListener(event,fn){if(listeners.get(event)===fn)listeners.delete(event);}};
 initBaseWallet({getElementById:id=>nodes[id]},{getProvider:()=>missing?null:provider});
 return {nodes,calls,listeners,connect:()=>nodes.baseWalletConnect.handlers.click(),disconnect:()=>nodes.baseWalletDisconnect.handlers.click()};
}
test("no implicit wallet access and explicit read-only Base session",async()=>{
 const f=fixture();assert.deepEqual(f.calls,[]);await f.connect();
 assert.deepEqual(f.calls,["eth_chainId","eth_requestAccounts","eth_chainId"]);assert.equal(f.nodes.baseWalletAddress.textContent,account);
 assert.equal(f.nodes.baseWalletConnect.disabled,true);assert.equal(f.nodes.baseWalletDisconnect.disabled,false);
 f.disconnect();assert.equal(f.nodes.baseWalletAddress.textContent,"");assert.equal(f.listeners.size,0);assert.equal(f.calls.length,3);
});
test("wrong chain and missing wallet never prompt for account or switch networks",async()=>{
 for(const f of [fixture({chain:"0x1"}),fixture({missing:true})]){
  await f.connect();assert.ok(!f.calls.includes("eth_requestAccounts"));assert.equal(f.nodes.baseWalletAddress.textContent,"");assert.equal(f.listeners.size,0);
 }
});
test("wallet events invalidate account and prevent stale session",async()=>{
 for(const event of ["accountsChanged","chainChanged","disconnect"]){
  const f=fixture();await f.connect();f.listeners.get(event)();assert.equal(f.nodes.baseWalletAddress.textContent,"");assert.equal(f.listeners.size,0);assert.equal(f.nodes.baseWalletConnect.disabled,false);
 }
});
test("pending account result cannot restore disconnected session",async()=>{
 let resolve,started;const ready=new Promise(r=>started=r);
 const f=fixture({requestHook:method=>method==="eth_chainId"?"0x2105":new Promise(r=>{resolve=r;started();})});
 const pending=f.connect();await ready;f.disconnect();resolve([account]);await pending;
 assert.equal(f.nodes.baseWalletAddress.textContent,"");assert.equal(f.listeners.size,0);
});
test("account and chain validation fail closed",async()=>{
 for(const a of [null,[],["0x"+"0".repeat(40)],["<script>"],[123]])assert.equal(baseAccount(a),null);
 const f=fixture({accounts:["bad"]});await f.connect();assert.equal(f.nodes.baseWalletAddress.textContent,"");
 let reads=0;const g=fixture({requestHook:method=>method==="eth_requestAccounts"?[account]:++reads===1?"0x2105":"0x1"});
 await g.connect();assert.equal(g.nodes.baseWalletAddress.textContent,"");
 const denied=fixture({requestHook:method=>{if(method==="eth_chainId")return "0x2105";throw Error("private provider detail");}});
 await denied.connect();assert.equal(denied.nodes.baseWalletAddress.textContent,"");assert.ok(!denied.nodes.baseWalletStatus.textContent.includes("private provider detail"));
});
