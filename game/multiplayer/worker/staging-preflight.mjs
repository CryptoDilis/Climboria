// GAME ONLY — isolated, read-only, owner-operated staging health/DO preflight.
// A fetch signal alone does not bound a hung response body or ignored abort.
// No JWTs, user identifiers, tickets or response-body contents are logged.
const SERVICE='climboria-game-room';
const MAX_STATUS_BYTES=8192;

export async function verifyGameRoomPreflight(base,kind,{
  fetchImpl=fetch,deadlineMs=15000,requireNearbyChat=false
}={}){
 if(!['health','ready'].includes(kind)||typeof requireNearbyChat!=='boolean'||
    !Number.isSafeInteger(deadlineMs)||
    deadlineMs<1||deadlineMs>30000)
  throw Error('Invalid Game preflight configuration');
 const endpoint=new URL(kind,base);
 if(endpoint.protocol!=='https:')
  throw Error('Game preflight requires HTTPS');
 const controller=new AbortController();
 let timer;
 const error=()=>Error('Game room '+kind+' preflight unavailable or unready');
 try{
  const work=(async()=>{
   const res=await fetchImpl(endpoint,{
    method:'GET',signal:controller.signal,redirect:'error',
    credentials:'omit',cache:'no-store',
    headers:{Accept:'application/json'}
   });
   if(res.status!==200)throw error();
   const contentLength=res.headers?.get?.('content-length');
   if(contentLength!==null&&contentLength!==undefined&&
      (!/^(?:0|[1-9][0-9]*)$/.test(contentLength)||
       Number(contentLength)>MAX_STATUS_BYTES))
    throw error();
   const body=await res.text();
   if(typeof body!=='string'||body.length>MAX_STATUS_BYTES)throw error();
   let data;
   try{data=JSON.parse(body)}catch{throw error()}
   if(data?.service!==SERVICE||data.gameplayPvP!==false||
      (kind==='health'&&(data.deployedGateway!==true||
                       (requireNearbyChat&&data.nearbyChatEnabled!==true)))||
      (kind==='ready'&&(data.bindingsConfigured!==true||
                        data.durableObjectReady!==true)))
    throw error();
   return true;
  })();
  const deadline=new Promise((_,reject)=>{
   timer=setTimeout(()=>{
    controller.abort();
    reject(error());
   },deadlineMs);
  });
  return await Promise.race([work,deadline]);
 }catch{
  // Deliberately do not echo HTTP bodies, hosts, credentials or provider data.
  throw error();
 }finally{clearTimeout(timer)}
}
