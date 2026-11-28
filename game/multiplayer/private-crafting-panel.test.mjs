import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateCraftingPanel} from './private-crafting-panel.mjs';

function fixture(){
 function el(tag){return {tag,children:[],textContent:'',attrs:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(k,v){this.attrs[k]=v;}};}
 const root=el('section');root.ownerDocument={createElement:el};
 let scope='session-a',requests=[];
 const panel=createPrivateCraftingPanel({container:root,getScope:()=>scope,readSnapshot:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});
 const data=()=>({ok:true,revision:1,stock:{fiber:2,wood:1,'raw-fish':0,'repair-kit':0,'cooked-fish':0}});
 const text=()=>{const collect=n=>[n.textContent,...n.children.flatMap(collect)];return collect(root).join(' ');};
 return {root,panel,requests,data,text,scope:v=>{scope=v;}};
}

test("recipeStatus", async function recipeStatus(){
 const f=fixture();let pending=f.panel.refresh();f.requests[0].resolve(f.data());assert.equal(await pending,true);
 assert.equal(f.root.children[2].children.length,5);assert.equal(f.root.children[3].children.length,2);
 assert.equal(f.text().includes('Fiber: 2 / 2'),true);assert.equal(f.text().includes('Materials available'),true);assert.equal(f.text().includes('Missing materials'),true);
 pending=f.panel.refresh();const full=f.data();full.stock['repair-kit']=20;f.requests[1].resolve(full);assert.equal(await pending,true);assert.equal(f.text().includes('Output stack full'),true);
 pending=f.panel.refresh();const empty=f.data();empty.stock.wood=0;f.requests[2].resolve(empty);assert.equal(await pending,true);assert.equal(f.text().includes('Materials available'),false);
});

test("malformed", async function malformed(){
 const f=fixture();let pending=f.panel.refresh();const x=f.data();x.stock['raw-fish']=-1;f.requests[0].resolve(x);assert.equal(await pending,false);
 pending=f.panel.refresh();const y=f.data();y.stock['<img>']=1;f.requests[1].resolve(y);assert.equal(await pending,false);assert.equal(f.text().includes('<img>'),false);
 pending=f.panel.refresh();f.requests[2].resolve({ok:false,reason:'crafting-not-provisioned'});assert.equal(await pending,false);assert.equal(f.text().includes('No training inventory'),true);
});

test("staleLifecycle", async function staleLifecycle(){
 const f=fixture(),old=f.panel.refresh();f.scope('session-b');const next=f.panel.refresh();
 f.requests[0].resolve(f.data());assert.equal(await old,false);f.requests[1].resolve(f.data());assert.equal(await next,true);
 const late=f.panel.refresh();f.scope(null);f.panel.clear();f.requests[2].resolve(f.data());assert.equal(await late,false);assert.equal(f.text().includes('Repair kit'),false);
 f.scope('session-c');const disposed=f.panel.refresh();f.panel.dispose();f.requests[3].resolve(f.data());assert.equal(await disposed,false);assert.equal(f.root.children.length,0);
});

import {createPrivateCraftingLedger} from './private-crafting-ledger.mjs';
import {createPrivateSurvivalLedger} from './private-survival-ledger.mjs';
function interactive(){
 function el(tag){return {tag,children:[],textContent:'',attrs:{},listeners:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.listeners[k]=v;}};}
 const root=el('section');root.ownerDocument={createElement:el};
 const A='fixture_account_a',S='fixture_session_a';let scope=S,station='campfire',records=new Map(),queue=Promise.resolve(),calls=0,hold=null;
 const storage={transaction(fn){const run=queue.then(async()=>{const staged=new Map(records);const r=await fn({get:async k=>staged.get(k),put:async(k,v)=>staged.set(k,v)});records=staged;return r;});queue=run.catch(()=>{});return run;}};
 const owner=(s,r)=>s===S?{sessionId:s,roomId:r,accountId:A}:null;
 const stationProof=(s,r)=>({...owner(s,r),station,inRange:station!==null});
 const craft=createPrivateCraftingLedger({roomId:'preview-crafting-fixture',storage,resolveOwner:owner,resolveStation:stationProof});
 const survival=createPrivateSurvivalLedger({roomId:'preview-survival-fixture',storage,resolveOwner:owner,hungerRate:50,thirstRate:60,
  resolveActiveInterval:(s,i,r)=>({...owner(s,r),intervalId:i,sequence:1,activeSeconds:60}),craftingOwner:owner,craftingStation:stationProof});
 const panel=createPrivateCraftingPanel({container:root,getScope:()=>scope,readSnapshot:()=>craft.inspect(scope),
  submitCraft:async q=>{calls++;if(hold)await hold;return craft.craft(q.scope,q.item,q.revision);},
  submitMeal:q=>survival.consumeCraftedMeal(q.scope,q.revision)});
 const find=label=>{const walk=n=>[...(n.tag==='button'?[n]:[]),...n.children.flatMap(walk)];return walk(root).find(n=>n.textContent===label);};
 const click=label=>find(label).listeners.click();
 const settle=async()=>{for(let n=0;n<100;n++)await Promise.resolve();};
 const text=()=>{const walk=n=>[n.textContent,...n.children.flatMap(walk)];return walk(root).join(' ');};
 async function setup(){await craft.provision(A,{fiber:2,wood:2,'raw-fish':1,'repair-kit':0,'cooked-fish':0});await survival.recordActiveInterval(S,'fixture_interval_1');await panel.refresh();}
 return {setup,find,click,settle,text,craft,survival,panel,S,scope:v=>{scope=v;},station:v=>{station=v;},hold:v=>{hold=v;},calls:()=>calls};
}
test('interactive private panel cooks and consumes one meal through real ledgers',async()=>{
 const f=interactive();await f.setup();
 const old=f.find('Craft Cooked fish');old.listeners.click();old.listeners.click();await f.settle();
 assert.equal(f.calls(),1);assert.equal((await f.craft.inspect(f.S)).stock['cooked-fish'],1);
 assert.equal(f.find('Eat cooked fish').disabled,false);
 f.click('Eat cooked fish');await f.settle();
 assert.equal((await f.survival.inspect(f.S)).hunger,9000);
 assert.equal((await f.craft.inspect(f.S)).stock['cooked-fish'],0);
 assert.equal(f.find('Eat cooked fish').disabled,true);
});
test('server denies unavailable station; stale action and account switch never repaint old inventory',async()=>{
 const f=interactive();await f.setup();f.station(null);f.click('Craft Cooked fish');await f.settle();
 assert.equal(f.text().includes('Action denied'),true);assert.equal((await f.craft.inspect(f.S)).revision,0);
 f.station('campfire');let release;f.hold(new Promise(r=>{release=r;}));const old=f.find('Craft Cooked fish');old.listeners.click();
 f.scope('fixture_session_b');f.panel.clear();release();await f.settle();
 assert.equal(f.text().includes('Cooked fish'),false);old.listeners.click();assert.equal(f.calls(),2);
});
