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
  assert.deepEqual(parseBaseMarketPairs(payload,OTHER).map(x=>x.priceUsd),[null]);
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
function fixture(fetchImpl) {
  const ids=Object.fromEntries(["baseMarketPanel","baseMarketForm","baseMarketContract",
    "baseMarketStatus","baseMarketResults","chainBase","chainSolana"].map(k=>[k,new El()]));
  const doc={ documentElement:{dataset:{climboriaSwapNetwork:"solana"}},getElementById(id){return ids[id]},createElement(){return new El()} };
  const scope={ fetch:fetchImpl, setTimeout,clearTimeout,addEventListener(){} };
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
  assert.match(html,/if\(selectedChain==='solana'\)\{u\.searchParams\.set\('from'/);
  assert.match(html,/u\.searchParams\.delete\('from'\);u\.searchParams\.delete\('to'\)/);
  assert.match(html,/walletButton\.disabled=isBase/);
  assert.match(html,/if\(selectedChain!=='solana'\)\{/);
  assert.match(html,/\$\('getQuote'\)\.disabled=isBase/);
  assert.match(html,/\$\('prepareSwap'\)\.disabled=isBase/);
  assert.match(html,/\$\('searchFrom'\)\.disabled=isBase/);
  assert.match(html,/data-climboria-managed-swap-network/);
});
