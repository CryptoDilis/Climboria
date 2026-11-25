import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('game/index.html','utf8');
const start=html.indexOf("const HERO_RECORD_KEY=");
const end=html.indexOf("const heroEditor=",start);
assert.ok(start>=0&&end>start);
const source=html.slice(start,end);
const user=id=>({data:{user:{id}},error:null});
function harness(getUser){
 const timers=new Map();let next=0,calls=0,updates=0;
 const context=vm.createContext({
  window:{supabase:{createClient:()=>({auth:{getUser:()=>{calls++;return getUser()}}})}},
  setTimeout(fn,ms){const id=++next;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)},updateHeroCard(){updates++},editorButtons(){},
 });
 vm.runInContext(source,context);
 const run=code=>vm.runInContext(code,context);
 const fire=ms=>{const hit=[...timers].find(([,t])=>t.ms===ms);assert.ok(hit,'timer '+ms);timers.delete(hit[0]);hit[1].fn()};
 return {run,fire,calls:()=>calls,updates:()=>updates,timers};
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('auth callback immediately revokes stale identity and defers provider call',async()=>{
 const h=harness(async()=>user('new-account'));
 h.run("heroAuthUser={id:'old-account'};heroAuthChecked=true;queueHeroLoginCheck()");
 assert.equal(h.run('heroAuthUser'),null);assert.equal(h.run('heroAuthChecked'),false);
 await flush();assert.equal(h.calls(),0);
 h.fire(0);await flush();
 assert.equal(h.run('heroAuthUser.id'),'new-account');assert.equal(h.run('heroAuthChecked'),true);
});
test('stalled provider fails closed and subsequent auth event recovers',async()=>{
 let hung=true;
 const h=harness(()=>hung?new Promise(()=>{}):Promise.resolve(user('recovered')));
 h.run('void checkHeroLogin()');await flush();h.fire(10000);await flush();
 assert.equal(h.run('heroAuthUser'),null);assert.equal(h.run('heroAuthChecked'),true);
 hung=false;h.run('queueHeroLoginCheck()');h.fire(0);await flush();
 assert.equal(h.run('heroAuthUser.id'),'recovered');
});
test('old provider result cannot restore an account after a newer auth event',async()=>{
 let release;let count=0;
 const h=harness(()=>++count===1?new Promise(r=>{release=r}):Promise.resolve(user('second')));
 h.run('void checkHeroLogin()');await flush();
 h.run('queueHeroLoginCheck()');h.fire(0);await flush();
 release(user('first'));await flush();
 assert.equal(h.run('heroAuthUser.id'),'second');
});
test('anonymous provider identity cannot unlock hero creation',async()=>{
 const h=harness(async()=>({data:{user:{id:'guest',is_anonymous:true}}}));
 h.run('void checkHeroLogin()');await flush();
 assert.equal(h.run('heroAuthUser'),null);assert.equal(h.run('heroAuthChecked'),true);
});
