import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.mjs";
import { encodeBase58 } from "../src/transaction-validation.mjs";

const origin = "https://climboria.fun";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const third = encodeBase58(new Uint8Array(32).fill(7));
const fourth = encodeBase58(new Uint8Array(32).fill(8));
const env = {
  JUPITER_API_KEY:"test-token",
  ALLOWED_ORIGINS:origin,
  RATE_LIMITER:{limit:async()=>({success:true})}
};

async function searchUsing(data) {
  const oldFetch=globalThis.fetch;
  try {
    let calls=0;
    globalThis.fetch=async(url,opts)=>{
      calls++;
      assert.match(String(url),/^https:\/\/api\.jup\.ag\/tokens\/v2\/search\?query=/);
      assert.equal(opts.headers["x-api-key"],"test-token");
      return Response.json(data);
    };
    const res=await worker.fetch(new Request(
      "https://worker.test/api/tokens/search?query=SOL",{headers:{origin}}
    ),env);
    return {status:res.status, body:await res.json(),calls};
  } finally { globalThis.fetch=oldFetch; }
}

test("only literal provider boolean true can yield a Jupiter verified badge",async()=>{
  const tokens=[
    {id:SOL,name:"Solana",symbol:"SOL",decimals:9,isVerified:"false"},
    {id:USDC,name:"USD Coin",symbol:"USDC",decimals:6,isVerified:"true"},
    {id:third,name:"Test",symbol:"TEST",decimals:9,isVerified:1},
    {id:fourth,name:"Real provider assertion",symbol:"T",decimals:9,isVerified:true}
  ];
  const result=await searchUsing(tokens);
  assert.equal(result.status,200);
  assert.equal(result.calls,1);
  assert.deepEqual(result.body.map(x=>x.isVerified),[false,false,false,true]);
  assert.equal(result.body[0].id,SOL);
});

test("rejects nonnumeric decimals and duplicate mints rather than assigning false verified status to wrong assets",async()=>{
  const result=await searchUsing([
    {id:SOL,symbol:"First",decimals:9,isVerified:false},
    {id:SOL,symbol:"Duplicate",decimals:9,isVerified:true},
    {id:USDC,symbol:"Bad string decimals",decimals:"6",isVerified:true},
    {id:third,symbol:"Bad fraction",decimals:3.5,isVerified:true},
    {id:fourth,symbol:"OK",decimals:18,isVerified:true},
    {id:"invalid",decimals:9,isVerified:true}
  ]);
  assert.equal(result.status,200);
  assert.deepEqual(result.body.map(x=>x.id),[SOL,fourth]);
  assert.deepEqual(result.body.map(x=>x.isVerified),[false,true]);
});

test("untrusted name and symbol types/controls and unsafe icons do not propagate to clients",async()=>{
  const result=await searchUsing([
    {id:SOL,name:{spoof:"USDC"},symbol:["SOL"],decimals:9,
      icon:"javascript:alert(1)",isVerified:"false"},
    {id:USDC,name:"\u202eUSD Coin\u0000",symbol:"\u0007USDC\u2069",decimals:6,
      icon:"https://localhost:443/track",isVerified:true},
    {id:third,name:"  A safe token  ",symbol:"  SAFE  ",decimals:9,
      icon:"https://cdn.example.org/assets/icon.png",isVerified:false},
    {id:fourth,name:"",symbol:"",decimals:0,
      icon:"https://127.0.0.1/secret",isVerified:false}
  ]);
  assert.equal(result.status,200);
  const a=result.body;
  assert.equal(a[0].name,"Unknown token");
  assert.equal(a[0].symbol,"TOKEN");
  assert.equal(a[0].icon,null);
  assert.equal(a[1].name,"USD Coin");
  assert.equal(a[1].symbol,"USDC");
  assert.equal(a[1].icon,null);
  assert.equal(a[2].name,"A safe token");
  assert.equal(a[2].symbol,"SAFE");
  assert.equal(a[2].icon,"https://cdn.example.org/assets/icon.png");
  assert.equal(a[3].name,"Unknown token");
  assert.equal(a[3].symbol,"TOKEN");
  assert.equal(a[3].icon,null);
});

test("upstream object in place of array does not masquerade as successful token search",async()=>{
  const result=await searchUsing({data:[{id:SOL,decimals:9,isVerified:true}]});
  assert.equal(result.status,502);
  assert.match(result.body.error,/invalid token search response/);
});

test("DEX and Swap browser quote selection use strict boolean verification, including direct-provider fallback",()=>{
  for(const file of ["../../../swap/index.html","../../index.html"]) {
    const html=readFileSync(new URL(file,import.meta.url),"utf8");
    assert.match(html,/isVerified:token\.isVerified===true/);
    assert.match(html,/t\.isVerified===true\?/);
    assert.match(html,/token\.isVerified===true\?/);
    assert.doesNotMatch(html,/isVerified:!!token\.isVerified/);
    assert.doesNotMatch(html,/(?:\bt|\btoken)\.isVerified\?/);
  }
});
