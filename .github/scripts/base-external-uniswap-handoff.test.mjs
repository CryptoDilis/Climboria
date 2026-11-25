import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const swap=readFileSync(new URL("../../swap/index.html",import.meta.url),"utf8");
const dex=readFileSync(new URL("../../dex/index.html",import.meta.url),"utf8");
const baseHandoff=/^<section class="external-jupiter-handoff" id="(swap|dex)ExternalBaseHandoff"[^>]*>[\s\S]*?<\/section>/gm;
function extractHandoff(html,id){
 const start=html.indexOf('id="'+id+'"');
 assert.ok(start>0,"Handoff exists: "+id);
 const from=html.lastIndexOf("<section",start);
 const to=html.indexOf("</section>",start);
 assert.ok(from>=0&&to>start);
 return html.slice(from,to+"</section>".length);
}
test("Base Swap always contains a separate, explicitly hidden external-provider handoff",()=>{
 const x=extractHandoff(swap,"swapExternalBaseHandoff");
 assert.match(x,/<section class="external-jupiter-handoff"[^>]* hidden /);
 assert.match(x,/Trade Base tokens on Uniswap · third-party website/);
 assert.match(x,/select Base network/);
 assert.match(x,/verify the exact token contracts/);
 assert.match(x,/no fee here/);
 assert.match(swap,/\$\('swapExternalBaseHandoff'\)\.hidden=!isBase;/);
 assert.match(swap,/\$\('swapExternalJupiterHandoff'\)\.hidden=isBase;/);
 assert.match(swap,/<section class="external-jupiter-handoff" id="swapExternalJupiterHandoff"/);
 assert.match(swap,/<section class="base-market-panel" id="baseMarketPanel" hidden/);
 assert.match(swap,/walletButton\.disabled=isBase;/);
});
test("DEX Base provider handoff is inside Base explorer, not inside Solana trade panel",()=>{
 const marker='<section class="panel" id="evmMarkets"';
 const position=dex.indexOf(marker);
 const selected=dex.indexOf('id="dexExternalBaseHandoff"');
 assert.ok(position>0&&selected>position);
 assert.ok(selected<dex.indexOf('id="baseMetadataForm"'));
 const x=extractHandoff(dex,"dexExternalBaseHandoff");
 assert.match(x,/Climboria DEX's Base market explorer is read-only/);
 assert.match(x,/choose Base network/);
 assert.match(x,/wallet approvals/);
 assert.match(x,/no Climboria trading fee is collected/);
 assert.match(dex,/id="dexExternalJupiterHandoff"/);
});
test("both external links target the same fixed HTTPS Uniswap app and never leak tokens or account data",()=>{
 for(const [html,id] of [[swap,"swapExternalBaseHandoff"],[dex,"dexExternalBaseHandoff"]]){
  const x=extractHandoff(html,id);
  const anchors=[...x.matchAll(/<a\b[^>]+>/g)];
  assert.equal(anchors.length,1);
  const anchor=anchors[0][0];
  assert.match(anchor,/href="https:\/\/app\.uniswap\.org\/swap"/);
  assert.match(anchor,/target="_blank"/);
  assert.match(anchor,/rel="noopener noreferrer"/);
  assert.match(anchor,/referrerpolicy="no-referrer"/);
  assert.match(anchor,/aria-label="[^"]*Base[^"]*"/);
  assert.doesNotMatch(anchor,/\?chain=|\?token=|\?input=|onclick=|javascript:|data-wallet|data-transaction/);
  assert.match(x,/No (Base )?token|Nothing is sent/);
 }
});
test("Base is still not presented as signable Climboria trading and independent execution stays disabled",()=>{
 const intent=readFileSync(new URL("../../dex/base-execution/intent-policy.mjs",import.meta.url),"utf8");
 const worker=readFileSync(new URL("../../dex/swap-proxy/src/index.mjs",import.meta.url),"utf8");
 assert.match(intent,/export const BASE_EXECUTION_ENABLED=false;/);
 assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
 assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
 assert.match(swap,/\$\('getQuote'\)\.disabled=isBase;/);
 assert.match(swap,/\$\('prepareSwap'\)\.disabled=isBase;/);
 assert.match(swap,/No Solana quote will be requested for a Base selection/);
 assert.match(swap,/Base trading remain unavailable in Climboria/);
 assert.match(dex,/Base Buy \/ Sell · Price Preview/);
});
