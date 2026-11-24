// A single Durable Object serializes reservations across regions.
// This is a request-attempt cap, not a guarantee about provider charges.
export const BUDGET_OBJECT_NAME="base-price-global-v1";
export const MAX_DAILY_ATTEMPTS=1000;
export function parseDailyCap(value){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,3})$/.test(value))return 0;
 const cap=Number(value);return cap<=MAX_DAILY_ATTEMPTS?cap:0;
}
export class BasePriceBudget{
 constructor(state,env){this.storage=state.storage;this.env=env;}
 async fetch(request){
  if(request.method!=="POST"||new URL(request.url).pathname!=="/reserve")return new Response(null,{status:404});
  const cap=parseDailyCap(this.env.BASE_PRICE_DAILY_ATTEMPTS);
  if(this.env.BASE_INDICATIVE_PRICE_ENABLED!=="true"||cap===0)return new Response(null,{status:503});
  const day=new Date().toISOString().slice(0,10);
  try{
   const reserved=await this.storage.transaction(async txn=>{
    const old=await txn.get("budget");
    if(old!==undefined&&(!old||typeof old.day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(old.day)||!Number.isSafeInteger(old.count)||old.count<0||old.count>MAX_DAILY_ATTEMPTS||old.day>day))throw Error("Invalid budget state");
    const count=old?.day===day?old.count:0;
    if(count>=cap)return false;
    await txn.put("budget",{day,count:count+1});
    return true;
   });
   return new Response(null,{status:reserved===true?204:429});
  }catch{return new Response(null,{status:503});}
 }
}
