// A single Durable Object serializes reservations across regions.
// Attempt counters are not a guarantee about provider charges or billing-cycle usage.
export const BUDGET_OBJECT_NAME="base-price-global-v1";
export const MAX_DAILY_ATTEMPTS=1000;
export const MAX_RELEASE_ATTEMPTS=10000;
function parseCap(value,max){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,4})$/.test(value))return 0;
 const cap=Number(value);return cap<=max?cap:0;
}
export function parseDailyCap(value){return parseCap(value,MAX_DAILY_ATTEMPTS);}
export function parseReleaseCap(value){return parseCap(value,MAX_RELEASE_ATTEMPTS);}
export class BasePriceBudget{
 constructor(state,env){this.storage=state.storage;this.env=env;}
 async fetch(request){
  if(request.method!=="POST"||new URL(request.url).pathname!=="/reserve")return new Response(null,{status:404});
  const cap=parseDailyCap(this.env.BASE_PRICE_DAILY_ATTEMPTS);
  // Optional cumulative ceiling for a future public release. Private staging
  // retains its existing daily cap; an explicitly configured invalid cap fails closed.
  // This ceiling NEVER resets at UTC midnight or month rollover.
  const configured=this.env.BASE_PRICE_RELEASE_TOTAL_ATTEMPTS!==undefined;
  const releaseCap=configured?parseReleaseCap(this.env.BASE_PRICE_RELEASE_TOTAL_ATTEMPTS):null;
  if(this.env.BASE_PRICE_PUBLIC_RELEASE==="true"&&(!configured||releaseCap<cap||releaseCap>1000||cap>100))return new Response(null,{status:503});
  if(this.env.BASE_INDICATIVE_PRICE_ENABLED!=="true"||cap===0||(configured&&releaseCap===0))return new Response(null,{status:503});
  const day=new Date().toISOString().slice(0,10);
  try{
   const result=await this.storage.transaction(async txn=>{
    const old=await txn.get("budget");
    if(old!==undefined&&(!old||typeof old.day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(old.day)||!Number.isSafeInteger(old.count)||old.count<0||old.count>MAX_DAILY_ATTEMPTS||old.day>day))throw Error("Invalid budget state");
    // Preserve known legacy daily attempts on upgrade; earlier historic days
    // cannot be reconstructed. Never represent total as full provider usage.
    const hasTotal=old!==undefined&&Object.hasOwn(old,"total");
    const total=hasTotal?old.total:(old?.count??0);
    if(!Number.isSafeInteger(total)||total<0||total<(old?.count??0)||total>=Number.MAX_SAFE_INTEGER)throw Error("Invalid cumulative budget state");
    const count=old?.day===day?old.count:0;
    if(count>=cap)return "daily";
    if(releaseCap!==null&&total>=releaseCap)return "release";
    await txn.put("budget",{day,count:count+1,total:total+1});
    return "reserved";
   });
   return new Response(null,{status:result==="reserved"?204:429,headers:result==="daily"||result==="release"?{"X-Base-Budget-Limit":result}:{}});
  }catch{return new Response(null,{status:503});}
 }
}
