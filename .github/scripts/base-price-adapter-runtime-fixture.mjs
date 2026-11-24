import {getBaseIndicativePrice,privatePriceDiagnostic} from "../../dex/base-price-provider/zeroex-indicative.mjs";
// Synthetic-only fixture, never shipped as the Worker entry point. All outbound
// requests are intercepted by Miniflare; the key and response are synthetic.
export default {async fetch(request){
 let transportError=null;
 try{
  const data=await getBaseIndicativePrice({chainId:8453,sellToken:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buyToken:"0x4200000000000000000000000000000000000006",sellAmount:"100000"},{enabled:true,apiKey:"synthetic-test-key",signal:request.signal,fetchImpl:async(url,options)=>{
   try{return await globalThis.fetch(url,options);}
   catch(e){transportError={name:e.name,message:e.message};throw e;}
  }});
  return Response.json(data);
 }catch(e){return Response.json({...privatePriceDiagnostic(e),...(transportError?{syntheticTransportError:transportError}:{})},{status:502});}
}};
