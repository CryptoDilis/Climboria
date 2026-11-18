#!/usr/bin/env node
/**
 * GAME ONLY: public staging's two credential-FREE, deliberately rejected
 * /ticket probes. They never issue any ticket, create an account, join a room,
 * or mutate room storage: gateway rejects on Origin / missing Authorization
 * BEFORE reading the request body or reaching Durable Objects/Supabase.
 *
 * This is a NEGATIVE security smoke check, not live two-user QA.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const ENDPOINT='https://rooms.climboria.fun/ticket';
const TRUSTED='https://climboria.fun';
const UNTRUSTED='https://invalid-origin.invalid';
const MAX_RESPONSE_BYTES=4096;

async function requireRejected({origin,status,reason},fetchImpl,deadlineMs){
 const abort=new AbortController();
 let timer;
 const work=(async()=>{
  const response=await fetchImpl(ENDPOINT,{
   method:'POST',
   redirect:'error',
   cache:'no-store',
   credentials:'omit',
   signal:abort.signal,
   headers:{Origin:origin,'Content-Type':'application/json',Accept:'application/json'},
   body:'{}'
  });
  if(response.status!==status||response.redirected)
   throw Error('Unexpected unauthenticated Game ticket status');
  const length=response.headers.get('content-length');
  if(length!==null&&(!/^(?:0|[1-9][0-9]*)$/.test(length)||
    Number(length)>MAX_RESPONSE_BYTES))
   throw Error('Unexpected unauthenticated Game ticket response size');
  if(origin===TRUSTED&&response.headers.get('access-control-allow-origin')!==TRUSTED)
   throw Error('Missing exact trusted-origin CORS');
  if(origin===UNTRUSTED&&response.headers.has('access-control-allow-origin'))
   throw Error('Untrusted-origin response exposed CORS');
  const raw=await response.text();
  if(raw.length>MAX_RESPONSE_BYTES)throw Error('Oversized unauthenticated Game response');
  let data;
  try{data=JSON.parse(raw)}catch{throw Error('Invalid Game ticket rejection JSON')}
  if(data?.error!==reason||Object.keys(data).length!==1)
   throw Error('Unexpected unauthenticated Game ticket rejection body');
  return true;
 })();
 const limit=new Promise((_,reject)=>{
  timer=setTimeout(()=>{
   abort.abort();
   reject(Error('Game ticket rejection probe timed out'));
  },deadlineMs);
 });
 try{return await Promise.race([work,limit])}
 finally{clearTimeout(timer)}
}

export async function verifyUnauthenticatedGameRoomDenials({
 fetchImpl=fetch,deadlineMs=10000
}={}){
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)
  throw Error('Invalid Game rejection probe deadline');
 await requireRejected({
  origin:TRUSTED,status:401,reason:'login-required'
 },fetchImpl,deadlineMs);
 await requireRejected({
  origin:UNTRUSTED,status:403,reason:'origin-not-allowed'
 },fetchImpl,deadlineMs);
 return Object.freeze({missingLoginDenied:true,forgedOriginDenied:true});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  await verifyUnauthenticatedGameRoomDenials();
  console.log('PASS: unauthenticated Game /ticket refused (401 login-required).');
  console.log('PASS: forbidden-origin Game /ticket refused (403 origin-not-allowed).');
  console.log('NOT VERIFIED: real registered accounts, authenticated WebSockets, GLB, World Chat or Android FPS.');
 }catch{
  // Never print upstream HTTP bodies, headers or credentials in public CI.
  console.error('FAIL: unauthenticated Game staging ticket gate not verified.');
  process.exitCode=1;
 }
}
