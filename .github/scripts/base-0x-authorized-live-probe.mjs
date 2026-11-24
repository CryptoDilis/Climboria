import {getBaseIndicativePrice} from "../../dex/base-price-provider/zeroex-indicative.mjs";

const apiKey=process.env.ZEROEX_API_KEY;
if(!apiKey?.trim())throw Error("Missing authorized server-side ZEROEX_API_KEY");
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH="0x4200000000000000000000000000000000000006";
for(const [direction,sellToken,buyToken,sellAmount] of [
 ["buy",USDC,WETH,"100000"],
 ["sell",WETH,USDC,"100000000000000"]
]){
 try{
  const result=await getBaseIndicativePrice({chainId:8453,sellToken,buyToken,sellAmount},{enabled:true,apiKey});
  if(result.executable!==false||result.indicativeOnly!==true||result.chainId!==8453)throw Error("Unsafe response");
  console.log(JSON.stringify({direction,chainId:result.chainId,indicativeOnly:result.indicativeOnly,executable:result.executable,requestedSellAmount:result.requestedSellAmount,reportedSellAmount:result.reportedSellAmount,estimatedBuyAmount:result.estimatedBuyAmount,providerMinBuyAmount:result.providerMinBuyAmount,fees:result.fees,reportedNetworkFee:result.reportedNetworkFee}));
 }catch{
  console.error("FAIL: controlled Base indicative "+direction+" probe; check credential, quota and provider schema without exposing secrets.");
  process.exitCode=1;
  break;
 }
}
if(!process.exitCode)console.log("PASS: two controlled read-only Base price requests; no wallet, approval, quote endpoint or execution.");
