/**
 * Private preview ticket storage. Separate namespace, no production ticket
 * compatibility. issueVerifiedAccount is server-only: caller must derive
 * userId from verified authentication, never browser JSON.
 */
const uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=/^[a-f0-9]{64}$/;
const TTL=30000,MAX_PENDING=32,MAX_PER_ACCOUNT=2;
const deny=reason=>({ok:false,reason});
const validTime=n=>Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER-TTL;
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function ticketHash(ticket){
 return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticket))));
}
export function createPreviewTicketStore({storage,roomId,clock=()=>Date.now()}={}){
 if(typeof storage?.transaction!=='function'||typeof roomId!=='string'||!/^preview-[a-z0-9-]{1,96}$/.test(roomId)||typeof clock!=='function')
  throw Error('Explicit private preview room storage required');
 const prefix='game:preview:ticket:v1:'+roomId+':';
 const validRecord=r=>r&&r.roomId===roomId&&typeof r.userId==='string'&&uid.test(r.userId)&&
  validTime(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.expiresAt===r.issuedAt+TTL;
 async function issueVerifiedAccount(userId){
  if(typeof userId!=='string'||!uid.test(userId))return deny('invalid-verified-account');
  userId=userId.toLowerCase();
  try{
   const ticket=toHex(crypto.getRandomValues(new Uint8Array(32))),key=prefix+await ticketHash(ticket);
   return await storage.transaction(async tx=>{
    const now=clock();if(!validTime(now))return deny('invalid-server-time');
    const records=await tx.list({prefix,limit:MAX_PENDING+1});
    if(!(records instanceof Map)||records.size>MAX_PENDING)return deny('preview-ticket-store-invalid');
    let total=0,owned=0;
    for(const [k,r] of records){
     if(typeof k!=='string'||!k.startsWith(prefix)||!validRecord(r)||r.issuedAt>now)
      return deny('preview-ticket-store-invalid');
     if(r.expiresAt<=now){await tx.delete(k);continue}
     total++;if(r.userId===userId)owned++;
    }
    if(total>=MAX_PENDING)return deny('preview-ticket-capacity');
    if(owned>=MAX_PER_ACCOUNT)return deny('preview-account-ticket-limit');
    if(await tx.get(key)!==undefined)return deny('preview-ticket-collision');
    const expiresAt=now+TTL;
    await tx.put(key,{roomId,userId,issuedAt:now,expiresAt});
    return {ok:true,ticket,expiresAt};
   });
  }catch{return deny('preview-ticket-storage-unavailable')}
 }
 async function consumeTicket(ticket){
  if(typeof ticket!=='string'||!hex.test(ticket))return null;
  // Do not swallow storage failures: gateway can distinguish unavailable
  // storage from a normal expired or already-consumed credential.
  const key=prefix+await ticketHash(ticket);
  return storage.transaction(async tx=>{
   const now=clock();if(!validTime(now))throw Error('invalid-server-time');
   const record=await tx.get(key);
   if(record===undefined)return null;
   await tx.delete(key);
   if(!validRecord(record)||record.issuedAt>now||record.expiresAt<=now)return null;
   return {userId:record.userId,expiresAt:record.expiresAt};
  });
 }
 return Object.freeze({issueVerifiedAccount,consumeTicket});
}
