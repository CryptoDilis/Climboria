// Private player resource fixture; deliberately separate from NPC synthetic stock.
export function createPrivatePlayerResources({roomId,storage,resolveOwner,resolveAction,resolveTick}={}){
 const ROOM='preview-player-resources-fixture',MAX=Number.MAX_SAFE_INTEGER,CAP=20,GROWTH=3,REGROWTH=2;
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const idOk=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(v);
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||[resolveOwner,resolveAction,resolveTick].some(f=>typeof f!=='function'))throw Error('Explicit private resource authority required');
 const key='game:preview:resources:v1:'+ROOM,stockKey=a=>key+':stock:'+a;
 let unavailable=false;
 function owner(s){const p=resolveOwner(s,ROOM);return p?.sessionId===s&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;}
 function state(p){
  if(p===undefined)return {version:1,tick:0,revision:0,woodReadyAt:0,plot:null};
  if(!p||p.version!==1||!int(p.tick,0,MAX)||!int(p.revision,p.tick,MAX)||!int(p.woodReadyAt,0,MAX)||p.woodReadyAt-p.tick>REGROWTH)return null;
  if(p.plot!==null&&(!p.plot||!idOk(p.plot.accountId)||!int(p.plot.readyAt,GROWTH,MAX)||p.plot.readyAt-p.tick>GROWTH))return null;
  return p;
 }
 function stock(p,a){
  if(p===undefined)return {version:1,accountId:a,wood:0,fiber:0};
  return p&&p.version===1&&p.accountId===a&&int(p.wood,0,CAP)&&int(p.fiber,0,CAP)?p:null;
 }
 const view=(p,a,r)=>({ok:true,tick:p.tick,revision:p.revision,woodReady:p.tick>=p.woodReadyAt,plot:p.plot===null?'empty':p.tick>=p.plot.readyAt?'ripe':'growing',ownedByYou:p.plot?.accountId===a,stock:{wood:r.wood,fiber:r.fiber}});
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 async function tx(fn){if(unavailable)return deny('resource-storage-unavailable');try{return await storage.transaction(fn);}catch{unavailable=true;return deny('resource-storage-unavailable');}}
 function tickProof(i){const p=resolveTick(i,ROOM);return p?.roomId===ROOM&&p.tickId===i&&int(p.sequence,1,MAX)?{sequence:p.sequence}:null;}
 function proof(s,i,a){
  const p=resolveAction(s,i,ROOM);
  if(!p||p.sessionId!==s||p.roomId!==ROOM||p.accountId!==a||p.actionId!==i||!int(p.revision,0,MAX)||
   !['plant','harvest','gather','clear'].includes(p.action)||p.site!==(p.action==='gather'?'forest-log':'farm-plot')||p.completed!==true||p.inRangeThroughout!==true)return null;
  return {revision:p.revision,action:p.action,site:p.site};
 }
 async function inspect(s){
  if(!idOk(s))return deny('invalid-resource-intent');
  return tx(async t=>{const a=owner(s);if(!a)return deny('unverified-resource-owner');const p=state(await t.get(key)),r=stock(await t.get(stockKey(a)),a);
   if(owner(s)!==a)return deny('unverified-resource-owner');return p&&r?view(p,a,r):deny('invalid-resource-state');});
 }
 async function advance(i){
  if(!idOk(i))return deny('invalid-resource-intent');
  return tx(async t=>{const q=tickProof(i);if(!q)return deny('unverified-resource-tick');const p=state(await t.get(key));
   if(!same(q,tickProof(i)))return deny('unverified-resource-tick');
   if(!p)return deny('invalid-resource-state');
   if(q.sequence!==p.tick+1||p.revision===MAX)return deny('resource-tick-conflict');
   const next={...p,tick:q.sequence,revision:p.revision+1};
   await t.put(key,next);if(!same(q,tickProof(i)))throw Error('Resource tick authority changed');
   return {ok:true,tick:next.tick,revision:next.revision};});
 }
 async function act(s,i){
  if(!idOk(s)||!idOk(i))return deny('invalid-resource-intent');
  return tx(async t=>{
   const a=owner(s);if(!a)return deny('unverified-resource-owner');
   const q=proof(s,i,a);if(!q)return deny('unverified-resource-action');
   const valid=()=>owner(s)===a&&same(q,proof(s,i,a));
   const p=state(await t.get(key)),r=stock(await t.get(stockKey(a)),a);
   if(!valid())return deny('unverified-resource-action');
   if(!p||!r)return deny('invalid-resource-state');
   if(p.revision!==q.revision||p.revision===MAX)return deny('resource-revision-conflict');
   const next={...p,revision:p.revision+1},earned={...r};
   if(q.action==='plant'){
    if(p.plot!==null)return deny('resource-plot-occupied');
    if(p.tick>MAX-GROWTH)return deny('resource-clock-exhausted');
    next.plot={accountId:a,readyAt:p.tick+GROWTH};
   }else if(q.action==='gather'){
    if(p.tick<p.woodReadyAt)return deny('resource-node-depleted');
    if(r.wood>=CAP)return deny('resource-stock-full');
    if(p.tick>MAX-REGROWTH)return deny('resource-clock-exhausted');
    next.woodReadyAt=p.tick+REGROWTH;earned.wood++;
   }else{
    if(p.plot?.accountId!==a)return deny('resource-plot-not-owned');
    if(q.action==='harvest'){
     if(p.tick<p.plot.readyAt)return deny('resource-crop-unripe');
     if(r.fiber>=CAP)return deny('resource-stock-full');
     earned.fiber++;
    }
    next.plot=null;
   }
   await t.put(key,next);if(!valid())throw Error('Resource authority changed during write');
   if(q.action==='gather'||q.action==='harvest'){await t.put(stockKey(a),earned);if(!valid())throw Error('Resource receipt authority changed');}
   return view(next,a,earned);
  });
 }
 return Object.freeze({inspect,advance,act,reviewedForProduction:false});
}
