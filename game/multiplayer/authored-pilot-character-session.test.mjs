import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAuthoredPilotCharacter} from './authored-pilot-character-session.mjs';
const A='s_'+'1'.repeat(32),B='s_'+'2'.repeat(32);
const snapshot={serverId:A,roomId:'preview-jarrell-camp-v1',health:500,maxHealth:500,downed:false,respawnAtMs:null,position:{x:-200,y:9,z:-170},observedAtMs:40000,stamina:200,sprintExhausted:false};
function fixture(patch={},hudOverride){
 let now=100,serial=0,closes=0;const timers=new Map(),sent=[],hud=[];
 class Socket extends EventTarget{
  readyState=1;
  send(raw){sent.push(JSON.parse(raw))}
  close(){if(this.readyState===3)return;this.readyState=3;closes++;this.dispatchEvent(new Event('close'))}
  reply(packet){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(packet)}))}
 }
 const socket=new Socket(),root={visible:true,position:{set(x,y,z){Object.assign(this,{x,y,z})}}};
 const options={socket,joined:{type:'preview-joined',fixture:'authored-camp-pilot',id:A,snapshot,expiresInMs:1000,...patch},root,footOffset:.25,
 renderHud:hudOverride??(v=>hud.push(v)),clock:()=>now,setTimer:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial},clearTimer:id=>timers.delete(id)};
 return {socket,root,options,sent,hud,timers,advance:n=>{now=n},closes:()=>closes};
}
test('pilot mount renders authoritative position, blocks stale input and closes on actual socket close',()=>{
 const f=fixture(),view=mountAuthoredPilotCharacter(f.options);
 assert.equal(f.root.visible,true);assert.equal(f.root.position.y,9.25);
 assert.equal(f.hud.at(-1).health,500);assert.equal(view.attack(B),true);
 assert.equal(view.move(1,0),false);
 f.socket.reply({type:'result',ok:true,targetId:B,damage:5});
 f.socket.reply({type:'preview-hit',actorId:B,targetId:A,health:495,damage:5,downed:false});
 f.advance(150);view.frame();assert.equal(f.root.visible,false);assert.equal(view.attack(B),false);
 f.socket.reply({type:'result',ok:true,snapshot:{...snapshot,health:495,observedAtMs:40200,position:{x:-199,y:8,z:-170}}});
 f.advance(160);view.frame();assert.equal(f.root.visible,true);assert.equal(f.root.position.y,8.25);assert.equal(f.hud.at(-1).health,495);
 f.socket.close();assert.equal(f.root.visible,false);assert.equal(f.hud.at(-1).status,'closed');assert.equal(view.move(1,0),false);
 assert.equal(f.timers.size,0);view.close();assert.equal(f.closes(),1);
});
test('client deadline closes even if the browser expiry timer was suspended',()=>{
 const f=fixture(),view=mountAuthoredPilotCharacter(f.options);
 f.advance(1100);assert.equal(view.attack(B),false);assert.equal(f.sent.length,0);
 assert.equal(f.closes(),1);assert.equal(f.root.visible,false);assert.equal(f.timers.size,0);
});
test('expiry timer closes without waiting for input or a render frame',()=>{
 const f=fixture(),view=mountAuthoredPilotCharacter(f.options);
 const expiry=[...f.timers.values()].find(t=>t.ms===1000);
 expiry.fn();assert.equal(f.closes(),1);assert.equal(view.frame(),false);assert.equal(f.hud.at(-1).status,'closed');
});
test('clock rollback and wrong fixture fail closed; no further commands',()=>{
 const f=fixture(),view=mountAuthoredPilotCharacter(f.options);
 f.advance(99);assert.equal(view.move(1,0),false);assert.equal(f.sent.length,0);assert.equal(f.closes(),1);
 const bad=fixture({fixture:'authored-camp-local'});assert.throws(()=>mountAuthoredPilotCharacter(bad.options));
 assert.equal(bad.root.visible,false);assert.equal(bad.closes(),1);assert.equal(bad.sent.length,0);
});
test('renderer exception closes transport and hides dedicated mesh',()=>{
 const f=fixture({},()=>{throw Error('render failed')});
 assert.throws(()=>mountAuthoredPilotCharacter(f.options));assert.equal(f.root.visible,false);
 assert.equal(f.closes(),1);assert.equal(f.timers.size,0);
});
