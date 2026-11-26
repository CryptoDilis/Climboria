import {observeFirmQuote} from "../../dex/base-execution/firm-quote-observation.mjs";
import {observeFirmQuoteAndPool} from "../../dex/base-execution/firm-quote-pool-observation.mjs";
try{
 const options={authorized:process.env.CONFIRMATION==="VERIFY_ONE_BASE_FIRM_QUOTE",taker:process.env.PUBLIC_TEST_TAKER,apiKey:process.env.ZEROEX_API_KEY};
 const withPool=process.env.OBSERVE_PUBLIC_POOL==="true";
 const result=withPool?await observeFirmQuoteAndPool({...options,poolAuthorized:true}):await observeFirmQuote(options);
 console.log(JSON.stringify(result));
 if(withPool&&result.poolObservationStatus!=="two-host-state-observed"){
  console.error("Pool diagnostics incomplete; no quote retry or execution permitted.");
  process.exitCode=1;
 }else console.log("PASS: one read-only firm quote observation; no signing, approvals or transactions. Candidate details are not execution authorization.");
}catch(error){
 console.error("FAIL: "+error.message);
 process.exitCode=1;
}
