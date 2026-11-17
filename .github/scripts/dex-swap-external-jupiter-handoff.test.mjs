import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const dex=readFileSync(new URL("../../dex/index.html",import.meta.url),"utf8");
const swap=readFileSync(new URL("../../swap/index.html",import.meta.url),"utf8");
const config=readFileSync(new URL("../../swap-config.js",import.meta.url),"utf8");
const worker=readFileSync(new URL("../../dex/swap-proxy/src/index.mjs",import.meta.url),"utf8");

function externalHandoff(html,id){
 const blocks=[...html.matchAll(/<section class="external-jupiter-handoff"[^>]*>[\s\S]*?<\/section>/g)];
 assert.equal(blocks.length,1,"Exactly one independent off-site handoff per page");
 const content=blocks[0][0];
 assert.ok(content.includes('id="'+id+'"'),"Handoff is placed in expected trading panel");
 const anchors=content.match(/<a\b[^>]*>/g)||[];
 assert.equal(anchors.length,1,"External link must be a plain user-initiated anchor");
 const anchor=anchors[0];
 assert.match(anchor,/\bhref="https:\/\/jup\.ag\/"/,"Only the official Jupiter homepage, no unverified deep link");
 assert.match(anchor,/\btarget="_blank"/,"Trading must not replace Climboria quote UI");
 assert.match(anchor,/\brel="noopener noreferrer"/,"Do not expose window.opener or referer");
 assert.match(anchor,/\breferrerpolicy="no-referrer"/,"Do not transmit selected mint in a referrer");
 assert.doesNotMatch(anchor,/\b(?:onclick|onmousedown|download|data-[a-z-]+)=/i,"No wallet scripts or delegated handoff");
 assert.doesNotMatch(anchor,/\?(?:inputMint|outputMint|amount|token|pool)=/,"No implied preselected route, mint or amount");
 assert.match(content,/No Climboria quote/,"Disclose the independent trade flow");
 assert.match(content,/no Climboria trading fee is collected/,"No false monetization claim");
 assert.match(content,/review the current route, slippage and fees in your wallet/,"Require wallet review");
 return content;
}

test("DEX token trade panel uses a safe external Jupiter handoff without enabling native trading",()=>{
 const block=externalHandoff(dex,"dexExternalJupiterHandoff");
 assert.ok(dex.indexOf(block)>dex.indexOf('id="dexTradePrepare"'),"Show external option after disabled native controls");
 assert.match(dex,/<button[^>]*\bid="dexTradePrepare"[^>]*\bdisabled\b/,"Native DEX prepare remains disabled");
});

test("Swap uses the same disclosure and isolated provider homepage; native release gates stay off",()=>{
 const block=externalHandoff(swap,"swapExternalJupiterHandoff");
 assert.ok(swap.indexOf(block)>swap.indexOf('id="quoteResults"'),"Place fallback after read-only quote output");
 assert.match(config,/\bproxyEnabled:\s*true\b/,"Quote proxy remains available");
 assert.match(config,/\benabled:\s*false\b/,"Public execution stays disabled");
 assert.match(config,/\bfeeCollectionEnabled:\s*false\b/,"No integrator fee collection");
 assert.match(config,/\bmanagedProvider:\s*Object\.freeze\(\{\s*enabled:\s*false\b/,"Unreviewed widget stays off");
 assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
 assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});

test("Swap Base tab hides offsite Solana-only Jupiter handoff; switching back restores it",()=>{
 const start=swap.indexOf("function setSwapChain(chain){");
 const end=swap.indexOf("\n}\n\n\nlet majorAssetChoices",start);
 assert.ok(start>0&&end>start,"Extract actual production chain-switching function");
 const nodes=Object.create(null);
 const element=id=>nodes[id]??=( { hidden:false, disabled:false, classList:{toggle(){}},textContent:"",innerHTML:"",placeholder:"" } );
 const actual="let selectedChain='solana';let autoQuoteTimer=null;let quoteTokens={from:{id:'SOL'},to:{id:'USDC'}};\n"+
   swap.slice(start,end+2)+"\n({setSwapChain})";
 const {setSwapChain}=runInNewContext(actual,{
  $:element,clearTimeout(){},invalidateSwapQuote(){},updateSelectedAsset(){},setSwapUrl(){}
 },{filename:"swap/index.html"});
 assert.equal(element("swapExternalJupiterHandoff").hidden,false,"Initial Solana handoff is available");
 setSwapChain("base");
 assert.equal(element("swapExternalJupiterHandoff").hidden,true,"Base must not direct users to Solana-only execution");
 assert.equal(element("getQuote").disabled,true,"Base quote remains unavailable");
 setSwapChain("solana");
 assert.equal(element("swapExternalJupiterHandoff").hidden,false,"Solana restores independent link");
 assert.equal(element("getQuote").disabled,false,"Solana read-only quote remains available");
 assert.match(swap,/\.external-jupiter-handoff\[hidden\]\{display:none\}/,"Author CSS must honor HTML hidden state");
});

test("External link is not injected into provider widget or automatically opened",()=>{
 for(const html of [dex,swap]){
  assert.equal((html.match(/href="https:\/\/jup\.ag\/"/g)||[]).length,1);
  assert.doesNotMatch(html,/window\.open\(['"]https:\/\/jup\.ag\//,"Never auto-open remote trader");
 }
});
