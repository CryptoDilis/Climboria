import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BASE_CHAIN_ID, BASE_MARKET_ENDPOINT, canonicalBaseAddress,
  parseBaseMarketPairs, baseMarketUrl, initializeBaseMarketPreview
} from "../../swap/base-market-preview.mjs";

const BASE_TOKEN = "0x" + "a".repeat(40);
const OTHER = "0x" + "b".repeat(40);
const POOL_A = "0x" + "c".repeat(40);
const POOL_B = "0x" + "d".repeat(40);
const pair = (opts = {}) => ({
  chainId:"base", pairAddress:POOL_A, dexId:"uniswap",
  baseToken:{ address:BASE_TOKEN, symbol:"TOKEN" },
  quoteToken:{ address:OTHER, symbol:"USDC" },
  priceUsd:"0.42", liquidity:{ usd:290000 }, volume:{ h24:12000 },
  priceChange:{ h24:"1.2" }, ...opts
});

test("only canonical 20-byte Base ERC-20 contracts may construct provider URLs", () => {
  assert.equal(BASE_CHAIN_ID,8453);
  assert.equal(canonicalBaseAddress(BASE_TOKEN.toUpperCase().replace("0X","0x")),BASE_TOKEN);
  assert.equal(baseMarketUrl(BASE_TOKEN),BASE_MARKET_ENDPOINT+BASE_TOKEN);
  for(const bad of ["ETH","USDC","So11111111111111111111111111111111111111112",
    "0x"+"a".repeat(39),"0x"+"a".repeat(41),"0x"+"x".repeat(40),
    BASE_TOKEN+"?router=true","https://evil.example",{},null]) {
    assert.equal(canonicalBaseAddress(bad),null,String(bad));
    assert.equal(baseMarketUrl(bad),null);
  }
});
test("Base pools must match exact contract, chain and a valid pool address", () => {
  const payload={ pairs:[
    pair({chainId:"ethereum"}),
    pair({chainId:"solana"}),
    pair({pairAddress:"SOLANA"}),
    pair({baseToken:{address:OTHER,symbol:"FAKE"},quoteToken:{address:"0x"+"1".repeat(40),symbol:"FAKE"}}),
    pair({liquidity:{usd:0}}),
    pair({liquidity:{usd:null}}),
    pair({liquidity:{usd:"NaN"}}),
    pair()
  ]};
  const result=parseBaseMarketPairs(payload,BASE_TOKEN);
  assert.equal(result.length,1);
  assert.equal(result[0].pairAddress,POOL_A);
  assert.equal(result[0].priceUsd,0.42);
  assert.equal(result[0].liquidityUsd,290000);
  assert.equal(result[0].volume24hUsd,12000);
  assert.equal(result[0].change24h,1.2);
  assert.deepEqual(parseBaseMarketPairs({pairs:[pair()]},OTHER).map(x=>x.priceUsd),[null]);
  assert.deepEqual(parseBaseMarketPairs({pairs:[]},BASE_TOKEN),[]);
  assert.deepEqual(parseBaseMarketPairs({},BASE_TOKEN),[]);
});
test("quote-side token never borrows the other token USD price or 24h change", () => {
  const q=pair({baseToken:{address:OTHER,symbol:"OTHER"},quoteToken:{address:BASE_TOKEN,symbol:"ME"},
    priceUsd:"9999",priceChange:{h24:999},liquidity:{usd:150}});
  const result=parseBaseMarketPairs({pairs:[q]},BASE_TOKEN);
  assert.equal(result.length,1);
  assert.equal(result[0].symbol,"ME");
  assert.equal(result[0].priceUsd,null);
  assert.equal(result[0].change24h,null);
  assert.equal(result[0].priceAvailable,false);
});
test("Base pool results are deterministic, bounded, sorted and de-duplicated", () => {
  const pairs=Array.from({length:14},(_,i)=>pair({
    pairAddress:"0x"+i.toString(16).padStart(40,"0"),
    liquidity:{usd:i+1}
  }));
  pairs.push(pair({pairAddress:"0x"+(13).toString(16).padStart(40,"0"),liquidity:{usd:2}}));
  const result=parseBaseMarketPairs({pairs},BASE_TOKEN);
  assert.equal(result.length,8);
  assert.equal(result[0].liquidityUsd,14);
  assert.equal(result.at(-1).liquidityUsd,7);
  assert.equal(new Set(result.map(x=>x.pairAddress)).size,result.length);
});
class El {
  constructor() { this.events=new Map();this.children=[];this.hidden=true;this.value="";this.dataset={};this.textContent=""; }
  get childElementCount(){return this.children.length;}
  addEventListener(type,handler){this.events.set(type,handler);}
  emit(type){return this.events.get(type)?.({preventDefault(){}});}
  replaceChildren(...nodes){this.children=nodes;}
  appendChild(node){this.children.push(node);return node;}
}
function fixture(fetchImpl, { network = "solana", search = "" } = {}) {
  const ids=Object.fromEntries(["baseMarketPanel","baseMarketForm","baseMarketContract",
    "baseMarketStatus","baseMarketResults","chainBase","chainSolana"].map(k=>[k,new El()]));
  const doc={ documentElement:{dataset:{climboriaSwapNetwork:network}},getElementById(id){return ids[id]},createElement(){return new El()} };
  const scope={ fetch:fetchImpl, setTimeout,clearTimeout,location:{search},addEventListener(){} };
  const controller=initializeBaseMarketPreview({doc,scope,fetchImpl});
  return {ids,doc,controller};
}
test("Base explorer never contacts provider on Solana or malformed input", async()=>{
  let requests=0;
  const {ids,doc,controller}=fixture(async()=>{requests++;throw Error("should not contact");});
  assert.equal(controller.ready,true);
  assert.equal(ids.baseMarketPanel.hidden,true);
  ids.baseMarketContract.value=BASE_TOKEN;
  await ids.baseMarketForm.emit("submit");
  assert.equal(requests,0);
  doc.documentElement.dataset.climboriaSwapNetwork="base";
  ids.chainBase.emit("click");
  assert.equal(ids.baseMarketPanel.hidden,false);
  ids.baseMarketContract.value="USDC";
  await ids.baseMarketForm.emit("submit");
  assert.equal(requests,0);
  assert.match(ids.baseMarketStatus.textContent,/exact 0x-prefixed/);
  doc.documentElement.dataset.climboriaSwapNetwork="solana";
  ids.chainSolana.emit("click");
  assert.equal(ids.baseMarketPanel.hidden,true);
});
test("Base explorer renders real matching pool data safely without signing or quoting",async()=>{
  const urls=[];
  const {ids,doc}=fixture(async(url,options)=>{
    urls.push({url,method:options.method,cache:options.cache});
    return {ok:true,headers:{get(){return null}},text:async()=>JSON.stringify({pairs:[pair({dexId:"<img src=x onerror=alert(1)>"})]})};
  });
  doc.documentElement.dataset.climboriaSwapNetwork="base";
  ids.chainBase.emit("click");
  ids.baseMarketContract.value=BASE_TOKEN;
  await ids.baseMarketForm.emit("submit");
  assert.deepEqual(urls,[{url:BASE_MARKET_ENDPOINT+BASE_TOKEN,method:"GET",cache:"no-store"}]);
  assert.equal(ids.baseMarketResults.children.length,3);
  const card=ids.baseMarketResults.children[1];
  assert.equal(card.children[0].textContent,"TOKEN / USDC · <img src=x onerror=alert(1)>");
  assert.equal(card.children[2].textContent.includes("$0.42"),true);
  assert.equal(card.children[3].href,"https://dexscreener.com/base/"+POOL_A);
  assert.match(ids.baseMarketStatus.textContent,/NOT executable quotes/);
});
test("switching away from Base rejects stale response without rendering old data",async()=>{
  let resume;
  const {ids,doc}=fixture(async() => {
    await new Promise(r=>{resume=r});
    return {ok:true,headers:{get(){return null}},text:async()=>JSON.stringify({pairs:[pair()]})};
  });
  doc.documentElement.dataset.climboriaSwapNetwork="base";ids.chainBase.emit("click");
  ids.baseMarketContract.value=BASE_TOKEN;const lookup=ids.baseMarketForm.emit("submit");
  doc.documentElement.dataset.climboriaSwapNetwork="solana";ids.chainSolana.emit("click");
  resume();
  await lookup;
  assert.equal(ids.baseMarketResults.children.length,0);
  assert.equal(ids.baseMarketPanel.hidden,true);
});
test("Swap view never represents Base liquidity data as a signable price quote",()=>{
  const html=readFileSync(new URL("../../swap/index.html",import.meta.url),"utf8");
  assert.match(html,/id="baseMarketPanel" hidden/);
  assert.match(html,/src="\/swap\/base-market-preview\.mjs\?v=1"/);
  assert.match(html,/Market data only · Base chain 8453/);
  assert.match(html,/Gas, allowances, wallet signing and Base trading remain unavailable/);
  assert.ok(html.includes("if(selectedChain==='solana'){u.searchParams.delete('contract');u.searchParams.set('from'"));
  assert.match(html,/u\.searchParams\.delete\('from'\);u\.searchParams\.delete\('to'\)/);
  assert.match(html,/walletButton\.disabled=isBase/);
  assert.match(html,/if\(selectedChain!=='solana'\)\{/);
  assert.match(html,/\$\('getQuote'\)\.disabled=isBase/);
  assert.match(html,/\$\('prepareSwap'\)\.disabled=isBase/);
  assert.match(html,/\$\('searchFrom'\)\.disabled=isBase/);
  assert.match(html,/data-climboria-managed-swap-network/);
});

test("exact Base DEX deep link prefills only a contract and never automatically fetches or trades", () => {
  let calls=0;
  const reader=async()=>{calls++;throw Error("No user consent");};
  const valid=fixture(reader,{network:"base",search:"?chain=base&contract="+BASE_TOKEN});
  assert.equal(valid.ids.baseMarketPanel.hidden,false);
  assert.equal(valid.ids.baseMarketContract.value,BASE_TOKEN);
  assert.match(valid.ids.baseMarketStatus.textContent,/prefilled from the DEX link/);
  assert.equal(calls,0,"Prefill must not request external data without explicit user click");
  for(const options of [
    {network:"base",search:"?chain=solana&contract="+BASE_TOKEN},
    {network:"solana",search:"?chain=base&contract="+BASE_TOKEN},
    {network:"base",search:"?chain=base&contract=https%3A%2F%2Fevil.example"},
    {network:"base",search:"?chain=base&contract=USDC"}
  ]) {
    const bad=fixture(reader,options);
    assert.equal(bad.ids.baseMarketContract.value,"");
  }
  assert.equal(calls,0);
});
test("DEX Base lists expose only exact-contract in-site inspect navigation", () => {
  const dex=readFileSync(new URL("../../dex/index.html",import.meta.url),"utf8");
  const swap=readFileSync(new URL("../../swap/index.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("../../dex/base-market-crosslink.css",import.meta.url),"utf8");
  assert.ok(dex.includes("function baseSwapInspectUrl(contract)"));
  assert.ok(dex.includes("/^0x[0-9a-fA-F]{40}$/.test(contract)"));
  assert.ok(dex.includes("'/swap/?chain=base&contract='"));
  assert.ok(dex.includes('class="base-cross-swap-link"'));
  assert.ok(dex.includes('class="base-market-card-stack"'));
  assert.ok(dex.includes('href="/dex/base-market-crosslink.css?v=1"'));
  assert.ok(css.includes(".base-market-card-stack"));
  assert.ok(swap.includes("u.searchParams.delete('contract')"));
  assert.ok(swap.includes("$('getQuote').disabled=isBase"));
});

test("Base DEX rejects malformed pool identities and renders unavailable metrics without fake zero", async () => {
  const { runInNewContext } = await import("node:vm");
  const html=readFileSync(new URL("../../dex/index.html",import.meta.url),"utf8");
  const numberSource=html.slice(html.indexOf("const reportedPoolNumber="),html.indexOf("const esc=s=>"));
  const baseSource=html.slice(html.indexOf("function validBaseMarketPair("),html.indexOf("async function load(){"));
  const nodes=Object.fromEntries(["baseSearch","baseSort","baseCoverage","baseRows","baseMobileCards","mobileBaseMore"].map(id=>[id,{value:"",innerHTML:"",textContent:""}]));
  const valid=pair({priceUsd:" ",volume:{h24:false},liquidity:{usd:-1},priceChange:{h24:" "}});
  const second=pair({pairAddress:POOL_B,priceChange:{h24:0},volume:{h24:0}});
  second.baseToken={...second.baseToken,symbol:42,name:{unexpected:true}};
  second.quoteToken={...second.quoteToken,symbol:["FAKE"]};
  second.dexId={unexpected:true};
  let fail=false,malformedResponse=false;
  const ctx={nodes,window:{matchMedia:()=>({matches:false})},get:async()=>{
    if(fail)throw Error("offline");
    if(malformedResponse)return {pairs:{unexpected:true}};
    return {pairs:[valid,{...valid,pairAddress:"0x"+ "C".repeat(40)},second,pair({chainId:"ethereum"}),pair({pairAddress:"bad"}),pair({quoteToken:{address:"USDC"}}),pair({baseToken:{address:"invalid"}})]};
  }};
  runInNewContext(`
    let basePairs=[],baseBusy=false,baseLoadError=null,basePartialFailures=0,baseMode="trending",baseMarketLimit=12;
    const $=id=>nodes[id];
    const esc=s=>String(s??"");
    const price=n=>Number.isFinite(n)?"$"+n:"—";
    const fmt=price;
    const pairAge=n=>String(n);
    `+numberSource+baseSource+`
    globalThis.api={loadBaseMarkets,renderBaseMarkets,validBaseMarketPair,baseMetric,compareBaseMetric,count:()=>basePairs.length};
  `,ctx);
  const api=ctx.api;
  assert.equal(api.validBaseMarketPair(valid),true);
  assert.equal(api.validBaseMarketPair(pair({pairAddress:"bad"})),false);
  assert.equal(api.validBaseMarketPair(pair({chainId:"ethereum"})),false);
  for(const k of ["price","change","volume","liquidity","age"]) assert.ok(Number.isNaN(api.baseMetric(valid,k)),k);
  assert.equal(api.baseMetric(second,"change"),0);
  assert.equal(api.baseMetric(second,"volume"),0);
  assert.equal(api.compareBaseMetric("volume",-1)(valid,valid),0);
  assert.equal(api.compareBaseMetric("volume",1)(valid,second),1);
  await api.loadBaseMarkets();
  assert.equal(api.count(),2,"reject invalid addresses and deduplicate casing");
  assert.ok(nodes.baseRows.innerHTML.includes("https://dexscreener.com/base/"+POOL_A));
  assert.ok(nodes.baseMobileCards.innerHTML.includes("https://dexscreener.com/base/"+POOL_A));
  assert.ok(nodes.baseRows.innerHTML.includes("N/A"));
  assert.ok(nodes.baseMobileCards.innerHTML.includes("24h Vol — · Liq —"));
  assert.ok(nodes.baseRows.innerHTML.includes("0.00%"));
  assert.ok(nodes.baseRows.innerHTML.includes("TOKEN / —"));
  assert.ok(nodes.baseMobileCards.innerHTML.includes("TOKEN / —"));
  assert.ok(nodes.baseMobileCards.innerHTML.includes("Unknown token"));
  assert.ok(!nodes.baseMobileCards.innerHTML.includes("[object Object]"));
  malformedResponse=true;
  await api.loadBaseMarkets();
  assert.equal(api.count(),2,"malformed response must not wipe last successful data");
  assert.match(nodes.baseCoverage.textContent,/Base refresh failed; showing last successful provider data/);
  malformedResponse=false;
  fail=true;
  await api.loadBaseMarkets();
  api.renderBaseMarkets();
  assert.match(nodes.baseCoverage.textContent,/Refresh failed/);
});
