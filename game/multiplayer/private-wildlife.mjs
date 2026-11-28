// R4 private synthetic wildlife. No retired models, actual terrain, combat or inventory.
export function createPrivateWildlife({roomId,storage,resolveTick,resolveOwner,resolveDefeat}={}){
 const ROOM='preview-wildlife-fixture', SITES=['clearing','trail','grove'], COOLDOWN=3, MAX=Number.MAX_SAFE_INTEGER;
 const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const idOk=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(v);
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||[resolveTick,resolveOwner,resolveDefeat].some(f=>typeof f!=='function'))throw Error('Explicit private wildlife authority required');
 const key='game:preview:wildlife:v1:'+ROOM, rewardKey=a=>key+':receipt:'+a;
 let unavailable=false;
 function read(p){
  if(p===undefined)return {version:1,tick:0,revision:0,generation:1,site:0,mode:'roam',remaining:0};
  if(!p||p.version!==1||!int(p.tick,0,MAX)||!int(p.revision,p.tick,MAX)||!int(p.generation,1,p.revision+1)||!int(p.site,0,SITES.length-1)||
   !['roam','flee','cooldown'].includes(p.mode)||!int(p.remaining,0,COOLDOWN)||(p.mode==='cooldown')!==(p.remaining>0))return null;
  return p;
 }
 const view=p=>({ok:true,tick:p.tick,revision:p.revision,generation:p.generation,site:SITES[p.site],mode:p.mode,remaining:p.remaining});
 function tickProof(i){
  const p=resolveTick(i,ROOM);
  return p?.roomId===ROOM&&p.tickId===i&&int(p.sequence,1,MAX)&&typeof p.threatNearby==='boolean'?{sequence:p.sequence,threatNearby:p.threatNearby}:null;
 }
 function owner(s){const p=resolveOwner(s,ROOM);return p?.roomId===ROOM&&p.sessionId===s&&idOk(p.accountId)?p.accountId:null;}
 function defeatProof(s,i,a){
  const p=resolveDefeat(s,i,ROOM);
  return p?.roomId===ROOM&&p.sessionId===s&&p.accountId===a&&p.defeatId===i&&int(p.generation,1,MAX)&&int(p.revision,0,MAX)&&SITES.includes(p.site)&&p.validatedDefeat===true&&p.inRange===true?{generation:p.generation,revision:p.revision,site:p.site}:null;
 }
 async function tx(fn){if(unavailable)return deny('wildlife-storage-unavailable');try{return await storage.transaction(fn);}catch{unavailable=true;return deny('wildlife-storage-unavailable');}}
 async function inspect(){return tx(async t=>{const p=read(await t.get(key));return p?view(p):deny('invalid-wildlife-state');});}
 // Only the trusted room can resolve a contiguous tick; there is no offline catch-up.
 async function advance(i){
  if(!idOk(i))return deny('invalid-wildlife-intent');
  return tx(async t=>{
   const proof=tickProof(i);if(!proof)return deny('unverified-wildlife-tick');
   const same=()=>JSON.stringify(tickProof(i))===JSON.stringify(proof);
   const p=read(await t.get(key));if(!same())return deny('unverified-wildlife-tick');
   if(!p)return deny('invalid-wildlife-state');
   if(proof.sequence!==p.tick+1||p.revision===MAX)return deny('wildlife-tick-conflict');
   let next={...p,tick:proof.sequence,revision:p.revision+1};
   if(p.mode==='cooldown'){
    next.remaining=p.remaining-1;
    if(next.remaining===0){
     if(p.generation===MAX)return deny('wildlife-generation-exhausted');
     next={...next,generation:p.generation+1,site:0,mode:'roam'};
    }
   }else{
    next.mode=proof.threatNearby?'flee':'roam';
    next.site=(p.site+(proof.threatNearby?2:1))%SITES.length;
   }
   await t.put(key,next);if(!same())throw Error('Wildlife tick authority changed');
   return view(next);
  });
 }
 // A verified defeat and one synthetic receipt commit together. No real items.
 async function recordDefeat(s,i){
  if(!idOk(s)||!idOk(i))return deny('invalid-wildlife-intent');
  return tx(async t=>{
   const a=owner(s);if(!a)return deny('unverified-wildlife-owner');
   const proof=defeatProof(s,i,a);if(!proof)return deny('unverified-wildlife-defeat');
   const same=()=>owner(s)===a&&JSON.stringify(defeatProof(s,i,a))===JSON.stringify(proof);
   const p=read(await t.get(key));if(!same())return deny('unverified-wildlife-defeat');
   if(!p)return deny('invalid-wildlife-state');
   if(p.mode==='cooldown'||p.generation!==proof.generation||p.revision!==proof.revision||SITES[p.site]!==proof.site||p.revision===MAX)return deny('wildlife-defeat-conflict');
   const r=await t.get(rewardKey(a));if(!same())return deny('unverified-wildlife-defeat');
   if(r!==undefined&&(!r||r.version!==1||r.accountId!==a||!int(r.count,1,MAX-1)||!int(r.generation,1,p.generation-1)||r.count>r.generation))return deny('invalid-wildlife-receipt');
   const next={...p,revision:p.revision+1,mode:'cooldown',remaining:COOLDOWN};
   const receipt={version:1,accountId:a,count:(r?.count??0)+1,generation:p.generation};
   await t.put(key,next);if(!same())throw Error('Wildlife defeat authority changed');
   await t.put(rewardKey(a),receipt);if(!same())throw Error('Wildlife receipt authority changed');
   return {...view(next),receiptCount:receipt.count};
  });
 }
 return Object.freeze({inspect,advance,recordDefeat,reviewedForProduction:false});
}
