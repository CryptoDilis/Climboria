import test from "node:test";
import assert from "node:assert/strict";
import { readBoundedProviderJson } from "../src/bounded-provider-json.mjs";
import worker from "../src/index.mjs";

const origin = "https://climboria.fun";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const env = {
  ALLOWED_ORIGINS: origin,
  JUPITER_API_KEY: "SECRET_SERVER_ONLY",
  RATE_LIMITER: { limit: async () => ({success:true}) }
};
const quotePath = "/api/swap/quote?inputMint=" + SOL +
  "&outputMint=" + USDC + "&amount=1000000";
const cases = [
  {
    path:quotePath, maxBytes:256*1024,
    valid:{requestId:"real-quote-123",inAmount:"1000000",outAmount:"210000"},
    expectedError:/incomplete or inconsistent quote/
  },
  {
    path:"/api/tokens/search?query=SOL",maxBytes:512*1024,
    valid:[{id:SOL,decimals:9,isVerified:true,name:"Solana",symbol:"SOL"}],
    expectedError:/invalid token search response/
  },
  {
    path:"/api/pump/coin?mint="+SOL,maxBytes:256*1024,
    valid:{mint:SOL,name:"Solana",symbol:"SOL"},
    expectedError:/invalid token metadata/
  }
];
const urlFor = path => new Request("https://worker.test"+path, {headers:{origin}});

test("bounded provider reader accepts valid small JSON but rejects malformed and absent bodies",async()=>{
  assert.deepEqual(await readBoundedProviderJson(Response.json({ok:true}),1024),{ok:true});
  assert.equal(await readBoundedProviderJson(new Response("{bad-json"),1024),null);
  assert.equal(await readBoundedProviderJson(new Response(null,{status:204}),1024),null);
  await assert.rejects(readBoundedProviderJson(Response.json({ok:true}),0),/Invalid provider response byte limit/);
});
test("declared size or actual streaming bytes exceeding the cap are refused without full parsing",async()=>{
  const content=new Response("{\"value\":1}",{
    headers:{"content-length":"999999"}
  });
  assert.equal(await readBoundedProviderJson(content,1024),null);
  let cancelled=false;
  let count=0;
  const forged={
    body:{
      getReader:()=>({
        async read(){count++;return {done:false,value:new Uint8Array(2048)};},
        async cancel(){cancelled=true;},
        releaseLock(){}
      })
    },
    headers:new Headers()
  };
  assert.equal(await readBoundedProviderJson(forged,1024),null);
  assert.equal(count,1,"must not continue reading an oversized stream");
  assert.equal(cancelled,true,"oversized stream must be cancelled");
});
test("broken upstream response streams are fail closed, without leaking internal errors",async()=>{
  const forged={
    body:{getReader:()=>({
      read:async()=>{throw Error("PRIVATE_PROVIDER_SECRET");},
      releaseLock(){}
    })},
    headers:new Headers()
  };
  assert.equal(await readBoundedProviderJson(forged,1024),null);
});
test("all public third-party routes reject over-limit JSON without returning a fake valid quote or token",async()=>{
  const original=globalThis.fetch;
  try {
    for(const scenario of cases){
      globalThis.fetch=async()=>Response.json({
        ...(Array.isArray(scenario.valid)?{items:scenario.valid}:scenario.valid),
        hugePad:"x".repeat(scenario.maxBytes+20)
      });
      const result=await worker.fetch(urlFor(scenario.path),env);
      assert.equal(result.status,502,scenario.path);
      const body=await result.json();
      assert.match(body.error,scenario.expectedError,scenario.path);
      assert.equal(body.transaction,undefined);
      assert.equal(body.signature,undefined);
      assert.equal(body.isVerified,undefined);
    }
  } finally { globalThis.fetch=original; }
});
test("provider responses below configured caps preserve normal quote, token and pump metadata behavior",async()=>{
  const original=globalThis.fetch;
  try {
    for(const scenario of cases) {
      globalThis.fetch=async(_url,options)=>{
        assert.equal(options.redirect,_url.includes("api.jup.ag")?"manual":"error","third-party redirects must never be followed");
        return Response.json(scenario.valid);
      };
      const result=await worker.fetch(urlFor(scenario.path),env);
      assert.equal(result.status,200,scenario.path);
      const body=await result.json();
      if(scenario.path===quotePath){
        assert.equal(body.inAmount,"1000000");
        assert.equal(body.outAmount,"210000");
        assert.equal(body.transaction,undefined);
      }else if(scenario.path.startsWith("/api/tokens/")){
        assert.equal(body[0].id,SOL);
        assert.equal(body[0].isVerified,true);
      }else assert.equal(body.mint,SOL);
    }
  } finally { globalThis.fetch=original; }
});
test("Jupiter redirect/transport errors are sanitized and never echo server-side credentials",async()=>{
  const original=globalThis.fetch;
  try {
    for(const path of [quotePath,"/api/tokens/search?query=SOL"]){
      globalThis.fetch=async(_url,options)=>{
        assert.equal(options.headers["x-api-key"],"SECRET_SERVER_ONLY");
        assert.equal(options.redirect,"manual");
        throw Error("redirect to https://hacker.example/?api-key=SECRET_SERVER_ONLY");
      };
      const result=await worker.fetch(urlFor(path),env);
      assert.equal(result.status,503);
      const body=await result.text();
      assert.match(body,/Jupiter upstream request failed or redirected/);
      assert.doesNotMatch(body,/SECRET_SERVER_ONLY|hacker\.example/);
    }
  } finally { globalThis.fetch=original; }
});
test("pump metadata redirect/transport errors fail closed without exposing external URLs",async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(_url,options)=>{
      assert.equal(options.redirect,"error");
      throw Error("unsafe redirect https://internal.example/api?token=DO_NOT_LEAK");
    };
    const result=await worker.fetch(urlFor("/api/pump/coin?mint="+SOL),env);
    assert.equal(result.status,502);
    const body=await result.text();
    assert.match(body,/metadata request failed or redirected/);
    assert.doesNotMatch(body,/DO_NOT_LEAK|internal\.example/);
  }finally{globalThis.fetch=original;}
});
test("malformed and partial JSON streams across public routes remain non-executable",async()=>{
  const original=globalThis.fetch;
  try{
    for(const path of [quotePath,"/api/tokens/search?query=SOL","/api/pump/coin?mint="+SOL]){
      globalThis.fetch=async()=>new Response("{ \"inAmount\": \"1000000\",",{status:200});
      const result=await worker.fetch(urlFor(path),env);
      assert.equal(result.status,502,path);
      const body=await result.json();
      assert.equal(body.transaction,undefined);
      assert.equal(body.signature,undefined);
    }
  }finally{globalThis.fetch=original;}
});
