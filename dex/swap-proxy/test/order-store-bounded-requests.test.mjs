import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SwapOrderStore } from "../src/order-store.mjs";

const routes=[
  ["PUT","/store"],["POST","/claim"],["POST","/settle"]
];
function object({ failStorage = false }={}){
  const storage={
    async get(){ if(failStorage) throw new Error("SECRET_STORAGE_CONNECTION_URL"); return undefined; },
    async setAlarm(){throw new Error("not expected");},
    transactionSync(){throw new Error("not expected");},
    kv:{get(){throw new Error("not expected");},put(){throw new Error("not expected");}}
  };
  return new SwapOrderStore({storage});
}
function fake(method,path,{contentType="application/json",contentLength=null,reader}={}){
  const headers=new Headers({"content-type":contentType});
  if(contentLength!==null)headers.set("content-length",contentLength);
  return {
    url:"https://order-store"+path,method,headers,
    body:{getReader(){return reader();}},
    text(){throw new Error("NEVER_READ_FULL_REQUEST_TEXT");}
  };
}
test("all Durable Object write routes refuse a streaming 60KB overflow immediately",async()=>{
  for(const [method,path] of routes){
    let reads=0,cancelled=false,released=false;
    const request=fake(method,path,{reader:()=>({
      async read(){reads++;return {done:false,value:new Uint8Array(35000)};},
      async cancel(){cancelled=true;},
      releaseLock(){released=true;}
    })});
    const response=await object().fetch(request);
    assert.equal(response.status,400,path);
    assert.match((await response.json()).error,/Request body too large/);
    assert.equal(reads,2,"must stop after first over-limit chunk");
    assert.equal(cancelled,true);assert.equal(released,true);
  }
});

test("oversized declared Content-Length is rejected before body access",async()=>{
  for(const [method,path] of routes){
    let readStarted=false;
    const request=fake(method,path,{
      contentLength:"65000",
      reader:()=>{readStarted=true;throw Error("body must not be read");}
    });
    const response=await object().fetch(request);
    assert.equal(response.status,400,path);
    assert.match((await response.json()).error,/Request body too large/);
    assert.equal(readStarted,false,path);
  }
});

test("rejects content-type smuggling, malformed lengths and invalid UTF-8",async()=>{
  for(const [method,path] of routes){
    const wrongType=fake(method,path,{
      contentType:"application/jsonp",
      reader:()=>{throw Error("body should not be read");}
    });
    const badType=await object().fetch(wrongType);
    assert.equal(badType.status,400,path);
    assert.match((await badType.json()).error,/Content-Type must be application\/json/);

    const invalidLength=fake(method,path,{
      contentLength:"6e4",
      reader:()=>{throw Error("body should not be read");}
    });
    const badLength=await object().fetch(invalidLength);
    assert.equal(badLength.status,400,path);
    assert.match((await badLength.json()).error,/Invalid Content-Length/);

    let once=false;
    const utf=fake(method,path,{reader:()=>({
      async read(){
        if(once)return {done:true};
        once=true;
        return {done:false,value:new Uint8Array([0x7b,0x22,0x78,0x22,0x3a,0xff,0x7d])};
      },releaseLock(){}
    })});
    const invalidUtf=await object().fetch(utf);
    assert.equal(invalidUtf.status,400,path);
    assert.match((await invalidUtf.json()).error,/Invalid JSON body/);
  }
});

test("read errors do not expose private URLs, user body, or implementation exceptions",async()=>{
  for(const [method,path] of routes){
    const request=fake(method,path,{reader:()=>({
      async read(){throw Error("PRIVATE_BODY https://rpc.internal/?token=SECRET");},
      releaseLock(){}
    })});
    const response=await object().fetch(request);
    assert.equal(response.status,400,path);
    const data=await response.json();
    assert.equal(data.error,"Invalid JSON body");
    assert.doesNotMatch(JSON.stringify(data),/PRIVATE_BODY|SECRET|rpc.internal/);
  }
});

test("valid streaming JSON continues through the existing claim/missing-record validation",async()=>{
  const body=JSON.stringify({signedTransaction:"x"});
  let called=0;
  const request=fake("POST","/claim",{reader:()=>({
    async read(){called++;return called===1
      ? {done:false,value:new TextEncoder().encode(body)}
      : {done:true};},
    releaseLock(){}
  })});
  const response=await object().fetch(request);
  assert.equal(response.status,404);
  assert.match((await response.json()).error,/not found or has expired/i);
  assert.equal(called,2);
});

test("internal Durable Object failures use a fixed error rather than leaking storage credentials",async()=>{
  const response=await object({failStorage:true}).fetch(new Request(
    "https://order-store/claim",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({signedTransaction:"x"})
    }
  ));
  assert.equal(response.status,503);
  const data=await response.json();
  assert.equal(data.error,"Order store failed securely");
  assert.doesNotMatch(JSON.stringify(data),/SECRET_STORAGE_CONNECTION_URL/);
});

test("the Durable Object no longer uses request.text() for untrusted order bodies",()=>{
  const src=readFileSync(new URL("../src/order-store.mjs",import.meta.url),"utf8");
  assert.match(src,/readBoundedRequestJson\(request, 60_000\)/);
  assert.doesNotMatch(src,/request\.text\(\)/);
});
