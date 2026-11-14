import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

const origin="https://climboria.fun";
const baseEnv={
  ALLOWED_ORIGINS:origin,
  JUPITER_API_KEY:"TEST_SECRET_DO_NOT_ECHO",
  EXECUTION_ENABLED:"false"
};
const tokenRequest=()=>new Request("https://worker.test/api/tokens/search?query=SOL",{headers:{origin}});
const quoteRequest=()=>new Request(
  "https://worker.test/api/swap/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000",
  {headers:{origin}});

test("Cloudflare rate-limit runtime exception is sanitized and blocks both read-only routes", async()=>{
  let upstreamCalls=0;
  const oldFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{upstreamCalls++;throw Error("Jupiter should never be called");};
    const env={...baseEnv,RATE_LIMITER:{
      async limit(){throw Error("Cloudflare namespace token=PRIVATE_NEVER_PRINT");}
    }};
    for(const req of [tokenRequest(),quoteRequest()]){
      const result=await worker.fetch(req,env);
      assert.equal(result.status,503);
      const body=await result.json();
      assert.deepEqual(body,{
        error:"Backend rate limiter temporarily unavailable",
        code:"RATE_LIMITER_UNAVAILABLE"
      });
      assert.equal(result.headers.get("access-control-allow-origin"),origin);
      assert.doesNotMatch(JSON.stringify(body),/PRIVATE_NEVER_PRINT/);
    }
    assert.equal(upstreamCalls,0);
  }finally{globalThis.fetch=oldFetch;}
});
test("missing Cloudflare rate-limiter binding remains fail-closed and distinguishable",async()=>{
  const result=await worker.fetch(tokenRequest(),baseEnv);
  assert.equal(result.status,503);
  const data=await result.json();
  assert.equal(data.code,"RATE_LIMITER_NOT_CONFIGURED");
});
test("rate limit rejection stays HTTP 429 and never falls through to upstream",async()=>{
  const oldFetch=globalThis.fetch;
  let upstreamCalls=0;
  try{
    globalThis.fetch=async()=>{upstreamCalls++;throw Error("never fetch");};
    const result=await worker.fetch(tokenRequest(),{
      ...baseEnv,RATE_LIMITER:{limit:async()=>({success:false})}
    });
    assert.equal(result.status,429);
    const data=await result.json();
    assert.equal(data.code,"RATE_LIMIT_EXCEEDED");
    assert.equal(upstreamCalls,0);
  }finally{globalThis.fetch=oldFetch;}
});
test("Cloudflare rate-limiter accepts normal requests without changing existing strict upstream redirect refusal",async()=>{
  const oldFetch=globalThis.fetch;
  let calls=0;
  try {
    globalThis.fetch=async(url,options)=>{
      calls++;
      assert.match(url,/^https:\/\/api\.jup\.ag\/tokens\/v2\/search\?query=/);
      assert.equal(options.redirect,"error");
      assert.equal(options.headers["x-api-key"],"TEST_SECRET_DO_NOT_ECHO");
      return Response.json([{id:"So11111111111111111111111111111111111111112",
        name:"Solana",symbol:"SOL",decimals:9,isVerified:true}]);
    };
    const result=await worker.fetch(tokenRequest(),{
      ...baseEnv,RATE_LIMITER:{limit:async()=>({success:true})}
    });
    assert.equal(result.status,200);
    assert.equal((await result.json())[0].isVerified,true);
    assert.equal(calls,1);
  }finally{globalThis.fetch=oldFetch;}
});
test("Jupiter outgoing transport error is still sanitized and distinct from a rate-limit outage",async()=>{
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>{throw Error("private https://api.jup.ag?key=TEST_SECRET_DO_NOT_ECHO");};
    const result=await worker.fetch(tokenRequest(),{
      ...baseEnv,RATE_LIMITER:{limit:async()=>({success:true})}
    });
    assert.equal(result.status,503);
    const data=await result.json();
    assert.equal(data.error,"Jupiter upstream request failed or redirected");
    assert.equal(data.code,undefined);
    assert.doesNotMatch(JSON.stringify(data),/TEST_SECRET_DO_NOT_ECHO/);
  }finally{globalThis.fetch=oldFetch;}
});
