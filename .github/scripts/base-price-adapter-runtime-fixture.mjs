import {getBaseIndicativePrice,privatePriceDiagnostic} from "../../dex/base-price-provider/zeroex-indicative.mjs";
export default {async fetch(request){
 try{
  const data=await getBaseIndicativePrice({chainId:8453,sellToken:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buyToken:"0x4200000000000000000000000000000000000006",sellAmount:"100000"},{enabled:true,apiKey:"synthetic-test-key",signal:request.signal});
  return Response.json(data);
 }catch(e){return Response.json(privatePriceDiagnostic(e),{status:502});}
}};
