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
