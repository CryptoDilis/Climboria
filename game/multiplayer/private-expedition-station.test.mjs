import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPrivateExpeditionStation} from './private-expedition-station.mjs';
import {createPrivateCraftingLedger} from './private-crafting-ledger.mjs';
const ROOM='preview-crafting-fixture',S='fixture_session_a',A='fixture_account_a',B='fixture_account_b';
function fixture(){
 let now=1000,account=A,lit=false,expiry=100000,seq=0;
 const owner=(s,r)=>s===S&&account?{sessionId:s,roomId:r,accountId:account}:null;
 const station=createPrivateExpeditionStation({roomId:ROOM,clock:()=>now,resolveOwner:owner,
  resolveLitFire:(s,r)=>({...owner(s,r),siteId:'expedition-camp',lit,litAtMs:1000,expiresAtMs:expiry})});
 function walk(x,n){for(let i=0;i<n;i++){assert.equal(station.input(S,{x,z:0,sequence:seq++}).ok,true);now+=100;assert.equal(station.tick().ok,true);}}
 return {station,owner,walk,at:v=>{now=v},account:v=>{account=v},lit:v=>{lit=v},expiry:v=>{expiry=v}};
}
test('authored station constants match browser camp and interaction range',()=>{
 const html=readFileSync(new URL('../play.html',import.meta.url),'utf8');
 assert.match(html,/camp:\{x:-200,z:-170,r:50\}/);
 assert.match(html,/const FACILITY_USE_RANGE=5;/);
 assert.match(html,/function canReachCampfire\(\)\{return canReachCampSite\(POI\.camp\)\}/);
});
test('actual server-ground movement approaches and leaves authored hearth; packet coordinates cannot teleport',()=>{
 const f=fixture(),s=f.station;assert.equal(s.join(S).ok,true);
 assert.equal(s.resolveStation(S,ROOM),null);
 assert.equal(s.input(S,{x:0,z:0,sequence:0,position:{x:-200,z:-170}}).ok,true);
 assert.equal(s.resolveStation(S,ROOM),null);
 f.at(1100);s.tick();
 // fixture walk sequence starts at zero, so use a fresh session fixture.
 const g=fixture(),p=g.station;assert.equal(p.join(S).ok,true);
 g.walk(1,4);assert.equal(p.resolveStation(S,ROOM).station,'campfire');
 assert.equal(p.resolveStation(S,'jarrell-peak'),null);
 assert.equal(p.resolveLitStation(S,ROOM),null);
 g.lit(true);assert.equal(p.resolveLitStation(S,ROOM).inRange,true);
 g.walk(-1,4);assert.equal(p.resolveStation(S,ROOM),null);
});
test('stale time, fire expiry, downed and owner reassignment deny proof',()=>{
 const f=fixture(),s=f.station;s.join(S);f.walk(1,4);f.lit(true);
 f.expiry(1400);assert.equal(s.resolveLitStation(S,ROOM),null);
 f.expiry(9000);f.at(2401);assert.equal(s.resolveStation(S,ROOM),null);
 f.at(2402);s.tick();assert.equal(s.resolveStation(S,ROOM).inRange,true);
 assert.equal(s.suspendForDeath(S),true);assert.equal(s.resolveStation(S,ROOM),null);
 const g=fixture(),p=g.station;p.join(S);g.walk(1,4);g.account(B);
 assert.equal(p.resolveStation(S,ROOM),null);assert.equal(p.input(S,{x:1,z:0,sequence:8}).ok,false);
 p.tick();g.account(A);assert.equal(p.resolveStation(S,ROOM),null);
 assert.throws(()=>createPrivateExpeditionStation({roomId:'public'}));
});
test('actual private crafting ledger accepts only near lit station and preserves stock on denial',async()=>{
 const f=fixture(),s=f.station;s.join(S);
 let records=new Map(),queue=Promise.resolve();
 const storage={transaction(fn){const run=queue.then(async()=>{const draft=new Map(records);const r=await fn({get:async k=>draft.get(k),put:async(k,v)=>draft.set(k,v)});records=draft;return r;});queue=run.catch(()=>{});return run;}};
 const craft=createPrivateCraftingLedger({roomId:ROOM,storage,resolveOwner:f.owner,resolveStation:s.resolveLitStation});
 await craft.provision(A,{fiber:2,wood:2,'raw-fish':2,'repair-kit':0,'cooked-fish':0});
 assert.equal((await craft.craft(S,'cooked-fish',0)).reason,'crafting-station-unavailable');
 f.walk(1,4);assert.equal((await craft.craft(S,'cooked-fish',0)).reason,'crafting-station-unavailable');
 f.lit(true);assert.equal((await craft.craft(S,'repair-kit',0)).reason,'crafting-station-unavailable');
 const r=await craft.craft(S,'cooked-fish',0);assert.equal(r.ok,true);assert.equal(r.stock.wood,1);assert.equal(r.stock['raw-fish'],1);
 f.walk(-1,4);assert.equal((await craft.craft(S,'cooked-fish',1)).reason,'crafting-station-unavailable');
 assert.equal((await craft.inspect(S)).stock['cooked-fish'],1);
});
