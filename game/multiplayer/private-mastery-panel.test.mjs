import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateMasteryPanel} from './private-mastery-panel.mjs';

function fixture(){
 const nodes=[];
 function element(tag){
  const n={tag,children:[],textContent:'',className:'',attrs:{},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(k,v){this.attrs[k]=v;}};
  nodes.push(n);return n;
 }
 const root=element('section');root.ownerDocument={createElement:element};
 let scope='session-a',requests=[];
 const panel=createPrivateMasteryPanel({container:root,getScope:()=>scope,readSnapshot:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});
 const snapshot=()=>({ok:true,skills:['climbing','swimming','fishing','farming','combat','endurance','survival','crafting','treasure-hunting','weapon-handling'].map(skill=>({skill,rank:skill==='climbing'?'Skilled':'Novice',validatedActivities:skill==='climbing'?3:0}))});
 const text=()=>{const collect=n=>[n.textContent,...n.children.flatMap(collect)];return collect(root).join(' ');};
 return {root,panel,requests,snapshot,text,scope:v=>{scope=v;}};
}

test("renderAndValidate", async function renderAndValidate(){
 const f=fixture(), pending=f.panel.refresh();
 assert.equal(f.text().includes('Loading'),true);
 f.requests[0].resolve(f.snapshot());assert.equal(await pending,true);
 assert.equal(f.root.children[2].children.length,10);
 assert.equal(f.text().includes('Climbing Skilled · 3 verified activities'),true);
 const invalid=f.panel.refresh(),data=f.snapshot();data.skills[1]=data.skills[0];
 f.requests[1].resolve(data);assert.equal(await invalid,false);
 assert.equal(f.text().includes('Skilled'),false);
 const bad=f.panel.refresh(),unsafe=f.snapshot();unsafe.skills[0].rank='<img onerror=x>';
 f.requests[2].resolve(unsafe);assert.equal(await bad,false);
 assert.equal(f.text().includes('<img'),false);
});

test("staleSessions", async function staleSessions(){
 const f=fixture(),old=f.panel.refresh();
 f.scope('session-b');const current=f.panel.refresh();
 f.requests[0].resolve(f.snapshot());assert.equal(await old,false);
 assert.equal(f.text().includes('Skilled'),false);
 f.requests[1].resolve(f.snapshot());assert.equal(await current,true);
 f.scope(null);f.panel.clear();
 assert.equal(f.text().includes('Skilled'),false);
 assert.equal(await f.panel.refresh(),false);
 assert.equal(f.text().includes('Sign in'),true);
 f.scope('session-c');const late=f.panel.refresh();f.scope('session-d');
 f.requests[2].resolve(f.snapshot());assert.equal(await late,false);
 assert.equal(f.text().includes('Skilled'),false);
});

test("lifecycle", async function lifecycle(){
 const f=fixture(),failed=f.panel.refresh();f.requests[0].reject(Error('network'));
 assert.equal(await failed,false);assert.equal(f.text().includes('unavailable'),true);
 const late=f.panel.refresh();f.panel.dispose();f.requests[1].resolve(f.snapshot());
 assert.equal(await late,false);assert.equal(f.root.children.length,0);assert.equal(await f.panel.refresh(),false);
});
