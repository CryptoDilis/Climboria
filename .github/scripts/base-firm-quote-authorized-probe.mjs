import {observeFirmQuote} from "../../dex/base-execution/firm-quote-observation.mjs";
try{
 const result=await observeFirmQuote({authorized:process.env.CONFIRMATION==="VERIFY_ONE_BASE_FIRM_QUOTE",taker:process.env.PUBLIC_TEST_TAKER,apiKey:process.env.ZEROEX_API_KEY});
 console.log(JSON.stringify(result));
 console.log("PASS: one read-only firm quote observation; no signing, approvals or transactions. Candidate details are not execution authorization.");
}catch(error){
 console.error("FAIL: "+error.message);
 process.exitCode=1;
}
