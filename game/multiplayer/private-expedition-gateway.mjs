import {createPrivateExpeditionCooking} from './private-expedition-cooking.mjs';
import {createPreviewTicketStore} from './worker/preview-ticket-store.mjs';

// Private station transport capability only. No production Worker import.
// issueVerifiedAccount is server-only, after authentication outside this module.
const ROOM='preview-crafting-fixture', TICKET_ROOM='preview-expedition-station-v1', TTL=60000;
const uid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sid=/^s_[a-f0-9]{32}$/;
const deny=reason=>({ok:false,reason});
const rev=n=>Number.isSafeInteger(n)&&n>=0;
const exact=(m,keys)=>Object.keys(m).length===keys.length&&keys.every(k=>Object.hasOwn(m,k));
export function createPrivateExpeditionGateway({storage,clock,allowAccount,sessionId=()=> 's_'+crypto.randomUUID().replace(/-/g,'')}={}){
 if(typeof storage?.transaction!=='function'||typeof clock!=='function'||typeof allowAccount!=='function'||typeof sessionId!=='function')
  throw Error('Explicit private expedition gateway authority required');
 const sessions=new Map(),accounts=new Map(),usedIds=new Set();
 let last=clock(),failed=!rev(last)||last>Number.MAX_SAFE_INTEGER-TTL;
 function time(){
  const now=clock();
  if(failed||!rev(now)||now>Number.MAX_SAFE_INTEGER-TTL||now<last){failed=true;return null;}
  last=now;return now;
 }
 const allowed=a=>uid.test(a)&&allowAccount(a)===true;
 function owner(s,r){
  const p=sessions.get(s),now=time();
  return p&&!p.closed&&now!==null&&now<p.deadline&&allowed(p.account)&&
   (r===ROOM||r==='preview-campsite-fixture')?{sessionId:s,accountId:p.account,roomId:r}:null;
 }
 const runtime=createPrivateExpeditionCooking({roomId:ROOM,storage,clock,resolveOwner:owner});
 const tickets=createPreviewTicketStore({storage,roomId:TICKET_ROOM,clock});
 function close(s){
  const p=sessions.get(s);if(!p)return;
  p.closed=true;sessions.delete(s);if(accounts.get(p.account)===s)accounts.delete(p.account);
  runtime.disconnect(s);
 }
 function sweep(){
  for(const s of sessions.keys())if(!owner(s,ROOM))close(s);
 }
 async function issueVerifiedAccount(account){
  if(typeof account!=='string'||!allowed(account.toLowerCase())||time()===null)return deny('station-account-denied');
  return tickets.issueVerifiedAccount(account.toLowerCase());
 }
 async function connect(ticket){
  if(time()===null)return deny('invalid-server-time');
  let v;try{v=await tickets.consumeTicket(ticket)}catch{return deny('station-ticket-unavailable')}
  const now=time();
  if(now===null||!v||!allowed(v.userId)||!rev(v.expiresAt)||v.expiresAt<=now)return deny('invalid-station-ticket');
  sweep();
  const id=sessionId();
  if(!sid.test(id)||usedIds.has(id)||usedIds.size>=256||accounts.has(v.userId)||sessions.size>=2)return deny('station-session-unavailable');
  const p={account:v.userId,deadline:now+TTL,closed:false,window:now,count:0,busy:false};
  usedIds.add(id);sessions.set(id,p);accounts.set(v.userId,id);
  const joined=runtime.join(id);
  if(!joined.ok){close(id);return joined;}
  async function receive(raw){
   const at=time();
   if(sessions.get(id)!==p)return deny('station-session-closed');
   if(at===null||!owner(id,ROOM)){close(id);return deny('station-session-closed');}
   if(at-p.window>=1000){p.window=at;p.count=0;}
   if(++p.count>24||typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>512){close(id);return deny('station-message-limit');}
   if(p.busy)return deny('station-action-pending');
   let m;try{m=JSON.parse(raw)}catch{return deny('invalid-station-packet')}
   if(!m||typeof m!=='object'||Array.isArray(m))return deny('invalid-station-packet');
   p.busy=true;
   try{
    let result;
    if(m.type==='input'&&exact(m,['type','x','z','sequence','sprint']))
     result=runtime.input(id,{x:m.x,z:m.z,sequence:m.sequence,sprint:m.sprint});
    else if(m.type==='stock'&&exact(m,['type']))result=await runtime.inspectStock(id);
    else if(m.type==='camp'&&exact(m,['type']))result=await runtime.inspectCamp(id);
    else if(['place','ignite','extinguish','cook'].includes(m.type)&&exact(m,['type','revision'])&&rev(m.revision))
     result=await runtime[m.type](id,m.revision);
    else if(m.type==='refuel'&&exact(m,['type','campRevision','inventoryRevision'])&&rev(m.campRevision)&&rev(m.inventoryRevision))
     result=await runtime.refuel(id,m.campRevision,m.inventoryRevision);
    else return deny('invalid-station-packet');
    if(sessions.get(id)!==p)return deny('station-session-closed');
    if(!owner(id,ROOM)){close(id);return deny('station-session-closed');}
    return result;
   }catch{if(sessions.get(id)===p)close(id);return deny('station-action-unavailable')}
   finally{p.busy=false;}
  }
  return {ok:true,id,snapshot:joined.snapshot,expiresInMs:TTL,receive,close:()=>{if(sessions.get(id)===p)close(id)}};
 }
 // Synthetic stock setup must not be routed from client messages.
 async function provisionVerifiedFixture(account,stock){
  if(typeof account!=='string'||!allowed(account.toLowerCase())||time()===null)return deny('station-account-denied');
  return runtime.provision(account.toLowerCase(),stock);
 }
 function tick(){sweep();return failed?deny('invalid-server-time'):runtime.tick();}
 return Object.freeze({issueVerifiedAccount,connect,tick,provisionVerifiedFixture,reviewedForProduction:false});
}
