/** Read-only operator preflight, exact private hostname, no credentials.
 * Never follow redirects or log headers, bodies, cookies or query strings.
 * Rate probe is opt-in, one bounded burst, no retries; not a billing meter.
 */
import https from 'node:https';
import {pathToFileURL} from 'node:url';
const HOST='game-combat-preview.climboria.fun';
const LOGIN='delicate-pine-4c5e.cloudflareaccess.com';
const LOGIN_PATH='/cdn-cgi/access/login/'+HOST;
const paths=Object.freeze([
 {name:'homepage',path:'/',method:'GET'},
 {name:'ticket',path:'/ticket',method:'POST'},
 {name:'websocket',path:'/ws',method:'GET',headers:Object.freeze({
  Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13',
  'Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ=='
 })}]);
function request(spec){
 return new Promise(resolve=>{
  let done=false;
  const finish=result=>{if(done)return;done=true;clearTimeout(timer);resolve(result)};
  const req=https.request({hostname:HOST,port:443,path:spec.path,method:spec.method,
   headers:{'Cache-Control':'no-cache',...spec.headers},agent:false,rejectUnauthorized:true},res=>{
   finish({status:res.statusCode,location:res.headers.location});res.destroy();
  });
  const timer=setTimeout(()=>{finish({status:0});req.destroy()},4000);
  req.on('upgrade',(res,socket)=>{finish({status:res.statusCode});socket.destroy()});
  req.on('error',()=>finish({status:0}));req.end();
 });
}
export function accessRedirect(result){
 if(!result||![302,303,307,308].includes(result.status)||typeof result.location!=='string')return false;
 try{
  const url=new URL(result.location);
  return url.origin==='https://'+LOGIN&&url.pathname===LOGIN_PATH&&!url.username&&!url.password;
 }catch{return false}
}
export async function preflight({probe=request,rateProbe=false}={}){
 const checks=[];
 for(const spec of paths){
  const result=await probe(spec);
  checks.push({name:spec.name,status:result?.status??0,ok:accessRedirect(result)});
 }
 // Do not burst if the preliminary Access tests did not all pass.
 const accessOk=checks.every(c=>c.ok);
 let rate={attempted:0,blocked:0,verified:false,unexpected:0};
 if(rateProbe&&accessOk){
  const results=await Promise.all(Array.from({length:24},()=>probe(paths[0])));
  rate={attempted:results.length,blocked:results.filter(r=>r?.status===429).length,
   unexpected:results.filter(r=>r?.status!==429&&!accessRedirect(r)).length,verified:false};
  rate.verified=rate.blocked>0&&rate.unexpected===0;
 }
 return {accessOk,checks,rate,ok:accessOk&&(!rateProbe||rate.verified)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]!=='CHECK_DISABLED_COMBAT_EDGE'||process.argv.slice(3).some(x=>x!=='--rate-probe')||process.argv.length>4){
  console.error('Refusing: explicit disabled preview confirmation required.');process.exitCode=1;
 }else{
  try{
   const result=await preflight({rateProbe:process.argv.includes('--rate-probe')});
   console.log(JSON.stringify(result,null,2));
   if(!result.ok)process.exitCode=1;
  }catch{console.error('Preflight failed; no network details logged.');process.exitCode=1}
 }
}
