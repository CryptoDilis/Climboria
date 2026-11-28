// Private R8.3 fixture. Rates and comfort thresholds are provisional test values.
export function createPrivateWeatherExposure({roomId,storage,resolveOwner,resolveInterval}={}) {
 const ROOM='preview-weather-fixture', MAX=10000;
 const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const idOk=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(v);
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function'||typeof resolveInterval!=='function')throw Error('Explicit private weather authority required');
 let unavailable=false;
 const key=a=>'game:preview:weather:v1:'+ROOM+':'+a;
 function owner(s){const p=resolveOwner(s,ROOM);return p?.sessionId===s&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;}
 function proof(s,i,a){
  const p=resolveInterval(s,i,ROOM);
  if(!p||p.roomId!==ROOM||p.sessionId!==s||p.accountId!==a||p.intervalId!==i||
   !int(p.sequence,1,Number.MAX_SAFE_INTEGER)||!int(p.seconds,1,60)||!int(p.temperatureC,-50,60)||
   !int(p.windKph,0,150)||!['dry','rain','snow'].includes(p.precipitation)||p.uniformThroughout!==true)return null;
  return {sequence:p.sequence,seconds:p.seconds,temperatureC:p.temperatureC,windKph:p.windKph,precipitation:p.precipitation};
 }
 function read(p,a){
  if(p===undefined)return {version:1,accountId:a,sequence:0,cold:0,heat:0};
  return p&&p.version===1&&p.accountId===a&&int(p.sequence,1,Number.MAX_SAFE_INTEGER)&&int(p.cold,0,MAX)&&int(p.heat,0,MAX)?p:null;
 }
 const view=p=>({ok:true,cold:p.cold,heat:p.heat,maximum:MAX,sequence:p.sequence});
 async function tx(fn){if(unavailable)return deny('weather-storage-unavailable');try{return await storage.transaction(fn);}catch{unavailable=true;return deny('weather-storage-unavailable');}}
 async function inspect(s){
  if(!idOk(s))return deny('invalid-weather-intent');
  return tx(async t=>{const a=owner(s);if(!a)return deny('unverified-weather-owner');
   const p=read(await t.get(key(a)),a);if(owner(s)!==a)return deny('unverified-weather-owner');
   return p?view(p):deny('invalid-weather-state');});
 }
 async function record(s,i){
  if(!idOk(s)||!idOk(i))return deny('invalid-weather-intent');
  return tx(async t=>{
   const a=owner(s);if(!a)return deny('unverified-weather-owner');
   const p=proof(s,i,a);if(!p)return deny('unverified-weather-interval');
   const same=()=>owner(s)===a&&JSON.stringify(proof(s,i,a))===JSON.stringify(p);
   const prior=read(await t.get(key(a)),a);
   if(!same())return deny('unverified-weather-interval');
   if(!prior)return deny('invalid-weather-state');
   if(p.sequence<=prior.sequence)return deny('weather-interval-already-recorded');
   if(p.sequence!==prior.sequence+1)return deny('weather-interval-out-of-order');
   // No client weather fields, offline catch-up, camp benefit, damage or stamina changes.
   const chill=p.temperatureC-Math.floor(p.windKph/15)-(p.precipitation==='dry'?0:4);
   const coldRate=chill<10?Math.min(100,10-chill):-2;
   const heatRate=p.temperatureC>32?Math.min(100,p.temperatureC-32):-2;
   const clamp=v=>Math.max(0,Math.min(MAX,v));
   const next={...prior,sequence:p.sequence,cold:clamp(prior.cold+p.seconds*coldRate),heat:clamp(prior.heat+p.seconds*heatRate)};
   await t.put(key(a),next);
   if(!same())throw Error('Weather authority changed during transaction');
   return view(next);
  });
 }
 return Object.freeze({inspect,record,reviewedForProduction:false});
}
