import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateEquipmentPanel} from './private-equipment-panel.mjs';

function fixture(){
 function el(tag){return {tag,children:[],textContent:'',attrs:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(k,v){this.attrs[k]=v;}};}
 const root=el('section');root.ownerDocument={createElement:el};
 let scope='session-a',requests=[];
 const panel=createPrivateEquipmentPanel({container:root,getScope:()=>scope,readSnapshot:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});
 const data=()=>({ok:true,item:'training-climbing-gloves',material:'training-repair-fiber',enhancement:5,remainingMaterials:40,durability:30,remainingRepairKits:2,maintenanceRevision:9});
 const text=()=>{const collect=n=>[n.textContent,...n.children.flatMap(collect)];return collect(root).join(' ');};
 return {root,panel,requests,data,text,scope:v=>{scope=v;}};
}

test("renderAndValidate", async function renderAndValidate(){
 const f=fixture();let pending=f.panel.refresh();f.requests[0].resolve(f.data());assert.equal(await pending,true);
 assert.equal(f.text().includes('Training climbing gloves +5'),true);
 assert.equal(f.root.children[3].attrs.value,'30');
 pending=f.panel.refresh();f.requests[1].resolve({...f.data(),durability:0});assert.equal(await pending,true);
 assert.equal(f.text().includes('Broken'),true);
 pending=f.panel.refresh();f.requests[2].resolve({...f.data(),durability:101});assert.equal(await pending,false);
 assert.equal(f.text().includes('+5'),false);
 pending=f.panel.refresh();f.requests[3].resolve({...f.data(),item:'<img onerror=x>'});assert.equal(await pending,false);
 assert.equal(f.text().includes('<img'),false);
 pending=f.panel.refresh();f.requests[4].resolve({...f.data(),enhancement:10,remainingMaterials:1});assert.equal(await pending,false);
});

test("staleAndMissing", async function staleAndMissing(){
 const f=fixture();const old=f.panel.refresh();f.scope('session-b');const current=f.panel.refresh();
 f.requests[0].resolve(f.data());assert.equal(await old,false);
 f.requests[1].resolve({ok:false,reason:'equipment-not-provisioned'});assert.equal(await current,false);
 assert.equal(f.text().includes('No equipment'),true);
 const late=f.panel.refresh();f.scope(null);f.panel.clear();f.requests[2].resolve(f.data());assert.equal(await late,false);
 assert.equal(f.text().includes('+5'),false);assert.equal(await f.panel.refresh(),false);
});

test("lifecycle", async function lifecycle(){
 const f=fixture();let pending=f.panel.refresh();f.requests[0].reject(Error('failed'));assert.equal(await pending,false);
 pending=f.panel.refresh();f.panel.dispose();f.requests[1].resolve(f.data());assert.equal(await pending,false);assert.equal(f.root.children.length,0);
});
