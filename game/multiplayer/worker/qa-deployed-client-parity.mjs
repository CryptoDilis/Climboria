/** Credential-free verification of the released Game client, not browser gameplay. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const SITE='https://climboria.fun/game/';
const VERSION=/\b(?:src)=["']\.\/multiplayer\/client-presence\.js\?v=([a-zA-Z0-9-]+)["']/g;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function version(html){
 const matches=[...html.matchAll(VERSION)];
 if(matches.length!==1)throw Error('Expected exactly one versioned Game presence script');
 return matches[0][1];
}
async function boundedFetch(url,max,fetchImpl,deadlineMs){
 const controller=new AbortController();
 let timer;
 const work=(async()=>{
  const response=await fetchImpl(url,{method:'GET',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal});
  if(response.status!==200||response.redirected||(response.url&&response.url!==url))throw Error('Published Game asset is unavailable');
  const type=response.headers.get('content-type')||'';
  if(url.endsWith('play.html')?!/^text\/html(?:;|$)/i.test(type):! /^(?:text|application)\/(?:javascript|ecmascript)(?:;|$)/i.test(type))throw Error('Unexpected published Game content type');
  const reader=response.body?.getReader();
  if(!reader)throw Error('No published Game body');
  const chunks=[];let size=0;
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>max){controller.abort();throw Error('Published Game body exceeds limit')}
    chunks.push(Buffer.from(value));
   }
   return Buffer.concat(chunks);
  }finally{reader.releaseLock()}
 })();
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Published Game asset deadline exceeded'))},deadlineMs)});
 try{return await Promise.race([work,deadline])}finally{clearTimeout(timer)}
}
export async function verifyDeployedClientParity({
 fetchImpl=fetch,
 loadHtml=()=>readFile(new URL('../../play.html',import.meta.url)),
 loadScript=()=>readFile(new URL('../client-presence.js',import.meta.url)),
 deadlineMs=15000
}={}){
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)throw Error('Invalid asset deadline');
 const expectedHtml=Buffer.from(await loadHtml());
 const expected=version(expectedHtml.toString('utf8'));
 const htmlSha256=sha(expectedHtml);
 const expectedHash=sha(await loadScript());
 const html=await boundedFetch(SITE+'play.html',8*1024*1024,fetchImpl,deadlineMs);
 if(version(html.toString('utf8'))!==expected)throw Error('Published Game presence version differs from checked-out release');
 if(sha(html)!==htmlSha256)throw Error('Published Game HTML bytes differ from checked-out release');
 const url=SITE+'multiplayer/client-presence.js?v='+expected;
 const deployed=await boundedFetch(url,512*1024,fetchImpl,deadlineMs);
 if(sha(deployed)!==expectedHash)throw Error('Published Game presence bytes differ from checked-out release');
 return {version:expected,sha256:expectedHash,htmlSha256};
}
