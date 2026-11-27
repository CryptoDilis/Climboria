import test from "node:test";
import assert from "node:assert/strict";
import {createSecondaryEvmWallet} from "../../swap/secondary-evm-wallet-readiness.mjs";
const account="0x"+"a".repeat(40);
function mock(chain="0x1",accounts=[account]){
 const calls=[],listeners=new Map();
 const provider={on(name,fn){const set=listeners.get(name)||new Set();set.add(fn);listeners.set(name,set);},
 removeListener(name,fn){listeners.get(name)?.delete(fn);},
 async request({method}){calls.push(method);if(method==="eth_chainId")return chain;if(method==="eth_requestAccounts")return accounts;throw Error("Forbidden method");}};
 return {provider,calls,listeners,emit(name){for(const fn of [...(listeners.get(name)||[])])fn();},setChain(value){chain=value;}};
}
for(const [id,hex] of [[1,"0x1"],[56,"0x38"]]){
 test("explicit read-only wallet session on "+id,async()=>{
  const m=mock(hex),wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
  assert.deepEqual(m.calls,[]);
  assert.deepEqual(await wallet.connect(id),{status:"connected-read-only",chainId:id,address:account});
  assert.deepEqual(m.calls,["eth_chainId","eth_requestAccounts","eth_chainId"]);
  assert.ok(Object.isFrozen(wallet.snapshot()));
  m.emit("chainChanged");
  assert.deepEqual(wallet.snapshot(),{status:"invalidated",chainId:null,address:null});
  assert.ok([...m.listeners.values()].every(set=>set.size===0));
 });
}
test("unsupported chain or wrong network never prompts for account access",async()=>{
 const m=mock("0x2105"),wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
 for(const id of [8453,137,0,"1",null,undefined])assert.equal((await wallet.connect(id)).status,"unsupported");
 assert.deepEqual(m.calls,[]);
 assert.equal((await wallet.connect(1)).status,"wrong-chain");
 assert.deepEqual(m.calls,["eth_chainId"]);
});
test("malformed or zero account cannot become connected",async()=>{
 for(const accounts of [null,[],["0x"+"0".repeat(40)],["invalid"],[{}]]){
  const m=mock("0x38",accounts),wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
  assert.equal((await wallet.connect(56)).status,"invalid-account");
  assert.equal(wallet.snapshot().address,null);
 }
});
test("chain recheck prevents wrong-chain account display",async()=>{
 const m=mock(),original=m.provider.request;
 m.provider.request=async args=>{const result=await original(args);if(args.method==="eth_requestAccounts")m.setChain("0x38");return result;};
 const wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
 assert.equal((await wallet.connect(1)).status,"wrong-chain");assert.equal(wallet.snapshot().address,null);
});
test("disconnect and account events fence late permission responses",async()=>{
 for(const event of ["accountsChanged","chainChanged","disconnect","local"]){
  const m=mock();let release,started;
  const waiting=new Promise(resolve=>started=resolve);
  const original=m.provider.request;
  m.provider.request=async args=>{if(args.method!=="eth_requestAccounts")return original(args);m.calls.push(args.method);started();return new Promise(resolve=>release=resolve);};
  const wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
  const pending=wallet.connect(1);await waiting;
  if(event==="local")wallet.disconnect();else m.emit(event);
  release([account]);await pending;
  assert.equal(wallet.snapshot().address,null);
  assert.deepEqual(m.calls,["eth_chainId","eth_requestAccounts"]);
  assert.ok([...m.listeners.values()].every(set=>set.size===0));
 }
});
test("provider missing, denied access or partial listener registration fails closed",async()=>{
 const absent=createSecondaryEvmWallet({getProvider:()=>null});
 assert.equal((await absent.connect(56)).status,"unavailable");
 const m=mock();m.provider.request=async()=>{throw Error("denied");};
 assert.equal((await createSecondaryEvmWallet({getProvider:()=>m.provider}).connect(1)).status,"unavailable");
 assert.ok([...m.listeners.values()].every(set=>set.size===0));
 const broken=mock(),on=broken.provider.on;
 broken.provider.on=(name,fn)=>{if(name==="chainChanged")throw Error("broken");on(name,fn);};
 assert.equal((await createSecondaryEvmWallet({getProvider:()=>broken.provider}).connect(1)).status,"unavailable");
 assert.ok([...broken.listeners.values()].every(set=>set.size===0));
});

test("synchronous provider invalidation during registration leaves no listener or wallet prompt",async()=>{
 const m=mock(),on=m.provider.on;
 m.provider.on=(name,fn)=>{if(name==="chainChanged")fn();on(name,fn);};
 const wallet=createSecondaryEvmWallet({getProvider:()=>m.provider});
 assert.equal((await wallet.connect(1)).status,"invalidated");
 assert.deepEqual(m.calls,[]);
 assert.ok([...m.listeners.values()].every(set=>set.size===0));
});
test("a newer chain connection supersedes a pending account permission response",async()=>{
 const old=mock("0x1"),fresh=mock("0x38"),original=old.provider.request;
 let release,started;
 const waiting=new Promise(resolve=>started=resolve);
 old.provider.request=async args=>{if(args.method!=="eth_requestAccounts")return original(args);old.calls.push(args.method);started();return new Promise(resolve=>release=resolve);};
 let provider=old.provider;
 const wallet=createSecondaryEvmWallet({getProvider:()=>provider});
 const pending=wallet.connect(1);await waiting;
 provider=fresh.provider;
 assert.equal((await wallet.connect(56)).chainId,56);
 release([account]);await pending;
 assert.deepEqual(wallet.snapshot(),{status:"connected-read-only",chainId:56,address:account});
 assert.ok([...old.listeners.values()].every(set=>set.size===0));
 assert.deepEqual(old.calls,["eth_chainId","eth_requestAccounts"]);
 assert.deepEqual(fresh.calls,["eth_chainId","eth_requestAccounts","eth_chainId"]);
});
