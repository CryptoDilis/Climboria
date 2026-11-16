// GAME ONLY — browser-origin ticket request used ONLY by owner-operated,
// two-registered-account multiplayer acceptance. No deployment or live
// multiplayer activation; never log JWTs or one-use tickets.
// Keep this function self-contained: Playwright serializes it into page.evaluate.
export async function requestGameRoomTicket({
 base,token,name,model,timeout=18000,fetchImpl
}){
 const fail=()=>Error('Game room authenticated ticket unavailable or invalid');
 if(!Number.isSafeInteger(timeout)||timeout<1||timeout>30000)
  throw Error('Invalid Game room ticket deadline');
 let ticketURL;
 try{
  ticketURL=new URL('ticket',base);
  if(ticketURL.protocol!=='https:'||ticketURL.username||ticketURL.password||
     ticketURL.search||ticketURL.hash||ticketURL.pathname!=='/ticket')
   throw fail();
 }catch{throw fail()}
 if(typeof token!=='string'||!token||token.length>4096)throw fail();
 const controller=new AbortController();
 let timer;
 try{
  const work=(async()=>{
   const response=await (fetchImpl||fetch)(ticketURL,{
    method:'POST',mode:'cors',credentials:'omit',redirect:'error',
    cache:'no-store',signal:controller.signal,
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({name,model})
   });
   if(response.status!==200)throw fail();
   const header=response.headers?.get?.('content-length');
   if(header!==null&&header!==undefined&&
      (!/^(?:0|[1-9][0-9]*)$/.test(header)||Number(header)>4096))
    throw fail();
   // Bound fetch AND its body: AbortSignal alone is insufficient if an
   // unhealthy Worker or body reader ignores cancellation.
   const raw=await response.text();
   if(typeof raw!=='string'||raw.length>4096)throw fail();
   let payload;
   try{payload=JSON.parse(raw)}catch{throw fail()}
   if(!/^[a-f0-9]{64}$/.test(payload?.ticket||'')||
      payload?.protocol!=='climboria-v1'||payload?.ttlSeconds!==30)
    throw fail();
   return payload.ticket;
  })();
  const deadline=new Promise((_,reject)=>{
   timer=setTimeout(()=>{
    controller.abort();
    reject(fail());
   },timeout);
  });
  return await Promise.race([work,deadline]);
 }catch{
  controller.abort();
  // Never include provider response body, token, ticket or auth details.
  throw fail();
 }finally{clearTimeout(timer)}
}
