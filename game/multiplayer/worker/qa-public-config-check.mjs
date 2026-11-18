#!/usr/bin/env node
/**
 * CLIMBORIA GAME ONLY — verify the PUBLIC deployed Game release switch.
 *
 * Unlike the checked-out repository config gate, this fetches the real
 * https://climboria.fun static Game config with no login, session data,
 * headers, redirects or mutating requests. It is NOT two-user multiplayer QA.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const PUBLIC_CONFIG='https://climboria.fun/game/multiplayer/client-config.json';
const MAX_BYTES=4096;

export async function verifyDeployedGameConfig({fetchImpl=fetch,deadlineMs=12000}={}){
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)
  throw Error('Invalid deployed Game config deadline');
 const abort=new AbortController();
 let timer;
 const work=(async()=>{
  const res=await fetchImpl(PUBLIC_CONFIG,{
   method:'GET',redirect:'error',cache:'no-store',credentials:'omit',
   signal:abort.signal,headers:{Accept:'application/json'}
  });
  if(res.status!==200||res.redirected||res.url&&res.url!==PUBLIC_CONFIG)
   throw Error('Deployed Game config is not directly available');
  const ct=res.headers?.get?.('content-type')||'';
  if(!/^application\/json(?:;|$)/i.test(ct.trim()))
   throw Error('Deployed Game config content type is not JSON');
  const size=res.headers?.get?.('content-length');
  if(size!==null&&size!==undefined&&
    (!/^(?:0|[1-9][0-9]*)$/.test(size)||Number(size)>MAX_BYTES))
   throw Error('Deployed Game config size is invalid');
  const raw=await res.text();
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES)
   throw Error('Deployed Game config response is too large');
  let config;
  try{config=JSON.parse(raw)}catch{throw Error('Deployed Game config JSON is invalid')}
  if(config?.schema!==1||config.enabled!==true||config.endpoint!=='https://rooms.climboria.fun/')
   throw Error('Deployed public Game gateway is not the approved registered-only room');
  return Object.freeze({deployedGameMultiplayer:'enabled-registered-only'});
 })();
 const deadline=new Promise((_,reject)=>{
  timer=setTimeout(()=>{
   abort.abort();
   reject(Error('Deployed Game config request timed out'));
  },deadlineMs);
 });
 try{return await Promise.race([work,deadline])}
 finally{clearTimeout(timer)}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  await verifyDeployedGameConfig();
  console.log('PASS: live climboria.fun Game client-config.json is HTTP 200 and registered-only multiplayer points to the approved Game gateway.');
  console.log('NOT VERIFIED: real authenticated two-player GLB, movement, World Chat or Android FPS.');
 }catch{
  // No response bodies, identities or operational secrets in public CI logs.
  console.error('FAIL: deployed public Game release config could not be verified as the approved Game gateway.');
  process.exitCode=1;
 }
}
