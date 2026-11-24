import test from "node:test";
import assert from "node:assert/strict";
import {BASE_PRICE_PREVIEW_ENABLED,BASE_PRICE_PREVIEW_ENDPOINT,previewIntent,parseBasePreviewAmount,previewLabels,initBasePricePreview} from "../../dex/base-price-preview.mjs";
const intent=previewIntent("buy","0.1");
const response={provider:"0x",chainId:8453,indicativeOnly:true,executable:false,sellToken:intent.sellToken,buyToken:intent.buyToken,requestedSellAmount:"100000",reportedSellAmount:"99850",estimatedBuyAmount:"29247834891471",providerMinBuyAmount:"28955356542556",fees:{zeroExFee:{amount:"150",token:intent.sellToken},integratorFee:null,gasFee:null},reportedNetworkFee:"1301007038488"};
test("exact decimal amounts and both directions",()=>{
 assert.equal(intent.sellAmount,"100000");assert.equal(previewIntent("sell","0.000000000000000001").sellAmount,"1");
 for(const bad of ["0","-1","1e3","1.0000001","01","NaN",""])assert.throws(()=>parseBasePreviewAmount(bad,6));
});
test("indicative response identifies exact tokens, raw input, fees, output and no execution",()=>{
 const labels=Object.fromEntries(previewLabels(intent,response));
 assert.equal(labels["Requested input"],"0.1 USDC");assert.equal(labels["Provider-reported sell amount"],"0.09985 USDC");assert.equal(labels["Estimated output"],"0.000029247834891471 WETH");assert.equal(labels["Provider fee"],"0.00015 USDC");
 for(const bad of [{chainId:1},{executable:true},{buyToken:intent.sellToken},{requestedSellAmount:"1"},{reportedSellAmount:"99849"},{providerMinBuyAmount:"9999999999999999"},{fees:{zeroExFee:null,integratorFee:null,gasFee:null}},{fees:{...response.fees,integratorFee:{amount:"1",token:intent.sellToken}}}])assert.throws(()=>previewLabels(intent,{...response,...bad}));
});
class El{constructor(){this.handlers={};this.value="";this.children=[];this.textContent="";this.disabled=false;}addEventListener(k,f){this.handlers[k]=f;}replaceChildren(){this.children=[];}append(n){this.children.push(n);}}
function fixture(options){const nodes=Object.fromEntries(["Form","Direction","Amount","Status","Result","Submit"].map(x=>["basePrice"+x,new El()]));const doc={getElementById:id=>nodes[id],createElement:()=>new El()};nodes.basePriceDirection.value="buy";initBasePricePreview(doc,options);return nodes;}
test("source defaults off and rejects unsafe endpoints",async()=>{
 assert.equal(BASE_PRICE_PREVIEW_ENABLED,false);assert.equal(BASE_PRICE_PREVIEW_ENDPOINT,null);
 let calls=0;for(const options of [{},{enabled:true,endpoint:"https://evil.example/v1/base/indicative-price"},{enabled:true,endpoint:"https://fakeclimboria.fun/v1/base/indicative-price"}]){
 const n=fixture({...options,fetchImpl:async()=>{calls++;throw Error("unexpected")}});n.basePriceAmount.value="0.1";await n.basePriceForm.handlers.submit({preventDefault(){}});assert.equal(n.basePriceSubmit.disabled,true);assert.equal(n.basePriceResult.children.length,0);}
 assert.equal(calls,0);
});
test("mocked approved endpoint uses only GET and ignores stale results",async()=>{
 let resume;const urls=[];
 const n=fixture({enabled:true,endpoint:"https://candidate.climboria.fun/v1/base/indicative-price",fetchImpl:async(url,opts)=>{urls.push(url);assert.equal(opts.method,"GET");assert.equal(opts.credentials,"omit");return new Promise(r=>resume=r);}});
 n.basePriceAmount.value="0.1";const pending=n.basePriceForm.handlers.submit({preventDefault(){}});n.basePriceAmount.handlers.input();resume(new Response(JSON.stringify(response)));await pending;assert.equal(n.basePriceResult.children.length,0);
 const next=n.basePriceForm.handlers.submit({preventDefault(){}});resume(new Response(JSON.stringify(response)));await next;
 assert.ok(n.basePriceResult.children.some(x=>x.textContent==="Provider fee: 0.00015 USDC"));
 assert.deepEqual(Object.fromEntries(new URL(urls[0]).searchParams),{chainId:"8453",sellToken:intent.sellToken,buyToken:intent.buyToken,sellAmount:"100000"});
 n.basePriceDirection.handlers.change();assert.equal(n.basePriceAmount.value,"");assert.equal(n.basePriceResult.children.length,0);
});
