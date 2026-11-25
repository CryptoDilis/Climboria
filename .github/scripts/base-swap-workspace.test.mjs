import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initBaseSwapWorkspace} from "../../swap/base-workspace.mjs";
import {BASE_PRICE_PREVIEW_ENABLED,BASE_PRICE_PREVIEW_ENDPOINT,BASE_PRICE_HEALTH_ENDPOINT} from "../../dex/base-price-preview.mjs";

const swap=readFileSync(new URL("../../swap/index.html",import.meta.url),"utf8");
const wallet=readFileSync(new URL("../../dex/base-wallet-session.mjs",import.meta.url),"utf8");
const price=readFileSync(new URL("../../dex/base-price-preview.mjs",import.meta.url),"utf8");
const execution=readFileSync(new URL("../../dex/base-execution/intent-policy.mjs",import.meta.url),"utf8");
const css=readFileSync(new URL("../../swap/base-workspace.css",import.meta.url),"utf8");

test("Swap Base-only workspace has exactly one wallet and one health-gated price preview",()=>{
 for(const id of [
  "baseSwapWorkspace","baseWalletConnect","baseWalletDisconnect",
  "baseWalletStatus","baseWalletAddress","basePriceForm","basePriceDirection",
  "basePriceAmount","basePriceAvailability","basePriceSubmit",
  "basePriceStatus","basePriceResult"
 ])assert.equal((swap.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(swap,/<section id="baseSwapWorkspace" class="base-swap-workspace" hidden/);
 assert.match(swap,/id="baseWalletDisconnect" disabled/);
 assert.match(swap,/id="basePriceSubmit" type="submit" disabled/);
 assert.match(swap,/value="buy">Buy WETH with USDC/);
 assert.match(swap,/value="sell">Sell WETH for USDC/);
 assert.match(swap,/Base transactions remain disabled inside Climboria/);
 assert.match(css,/\.base-swap-workspace\[hidden\]\{display:none!important\}/);
});
test("uses existing DEX wallet and preview modules without activating Base routing",()=>{
 for(const source of [
  "/dex/base-wallet-session.mjs?v=1",
  "/dex/base-price-preview.mjs?v=2",
  "/swap/base-workspace.mjs?v=1",
  "/swap/base-workspace.css?v=1"
 ])assert.ok(swap.includes(source),source);
 assert.match(wallet,/method:"eth_chainId"/);
 assert.match(wallet,/method:"eth_requestAccounts"/);
 assert.doesNotMatch(wallet,/eth_sendTransaction|eth_sendRawTransaction|personal_sign|wallet_switchEthereumChain|eth_signTypedData/i);
 assert.match(price,/healthGated:true/);
 assert.equal(BASE_PRICE_PREVIEW_ENABLED,false);
 assert.equal(BASE_PRICE_PREVIEW_ENDPOINT,null);
 assert.equal(BASE_PRICE_HEALTH_ENDPOINT,"https://base-price.climboria.fun/health");
 assert.match(execution,/export const BASE_EXECUTION_ENABLED=false;/);
 assert.match(swap,/\$\('getQuote'\)\.disabled=isBase;/);
 assert.match(swap,/\$\('prepareSwap'\)\.disabled=isBase;/);
 assert.match(swap,/walletButton\.disabled=isBase;/);
 assert.match(swap,/<section class="external-jupiter-handoff" id="swapExternalBaseHandoff" hidden/);
 assert.match(swap,/href="https:\/\/app\.uniswap\.org\/swap"/);
});
function fixture(initial="solana",disconnectEnabled=true){
 const events=new Map(),amountEvents=[];
 const nodes={
  baseSwapWorkspace:{hidden:true},
  chainBase:{},
  basePriceAmount:{
   value:"0.1",dispatchEvent(e){amountEvents.push(e.type)}
  },
  baseWalletDisconnect:{
   disabled:!disconnectEnabled,click(){this.clicks=(this.clicks||0)+1}
  }
 };
 const doc={
  documentElement:{dataset:{climboriaSwapNetwork:initial}},
  defaultView:{Event:class Event{constructor(type){this.type=type}}},
  getElementById:id=>nodes[id],
  addEventListener:(type,fn)=>events.set(type,fn)
 };
 return {doc,nodes,events,amountEvents};
}
test("initial Solana hides Base workspace; entering Base does not open wallet or provider automatically",()=>{
 const {doc,nodes,events,amountEvents}=fixture();
 const controller=initBaseSwapWorkspace(doc);
 assert.equal(controller.ready,true);
 assert.equal(nodes.baseSwapWorkspace.hidden,true);
 assert.equal(nodes.baseWalletDisconnect.clicks||0,0);
 assert.equal(amountEvents.length,0);
 doc.documentElement.dataset.climboriaSwapNetwork="base";
 events.get("climboria:managed-provider-pair-change")();
 assert.equal(nodes.baseSwapWorkspace.hidden,false);
 assert.equal(nodes.baseWalletDisconnect.clicks||0,0);
 assert.equal(amountEvents.length,0);
});
test("leaving Base aborts pending price via original input listener and invalidates Base session",()=>{
 const {doc,nodes,events,amountEvents}=fixture("base");
 initBaseSwapWorkspace(doc);
 assert.equal(nodes.baseSwapWorkspace.hidden,false);
 doc.documentElement.dataset.climboriaSwapNetwork="solana";
 events.get("climboria:managed-provider-pair-change")();
 assert.equal(nodes.baseSwapWorkspace.hidden,true);
 assert.equal(nodes.basePriceAmount.value,"");
 assert.deepEqual(amountEvents,["input"]);
 assert.equal(nodes.baseWalletDisconnect.clicks,1);
 // Repeated Solana-pair events must NOT repeatedly revoke hidden Base sessions.
 events.get("climboria:managed-provider-pair-change")();
 assert.deepEqual(amountEvents,["input"]);
 assert.equal(nodes.baseWalletDisconnect.clicks,1);
 doc.documentElement.dataset.climboriaSwapNetwork="base";
 events.get("climboria:managed-provider-pair-change")();
 assert.equal(nodes.baseSwapWorkspace.hidden,false);
});
test("already disconnected Base wallet gets no synthetic click; missing controls stay inert",()=>{
 const {doc,nodes,events}=fixture("base",false);
 initBaseSwapWorkspace(doc);
 doc.documentElement.dataset.climboriaSwapNetwork="solana";
 events.get("climboria:managed-provider-pair-change")();
 assert.equal(nodes.baseWalletDisconnect.clicks||0,0);
 assert.equal(initBaseSwapWorkspace({getElementById:()=>null}).ready,false);
});
