import test from 'node:test';
import assert from 'node:assert/strict';
import {ServerCombatState} from './server-combat-state.mjs';

const A='s_11111111111111111111111111111111',B='s_22222222222222222222222222222222',C='s_33333333333333333333333333333333';
const at=(x)=>({id:x,position:{x:x===A?200:201,y:10,z:20}});
function make({verified=false}={}){
 let clock=40_000;
 const room={roomId:'jarrell-peak',members:new Map([[A,at(A)],[B,at(B)],[C,at(C)]])};
 const trustedPositions=new Map([[A,{x:200,y:10,z:20}],[B,{x:201,y:10,z:20}],[C,{x:201,y:10,z:20}]]);
 const combat=new ServerCombatState({room,now:()=>clock,trustedPosition:id=>verified?trustedPositions.get(id):null});
 return {room,combat,trustedPositions,setClock:n=>{clock=n}};
}
const start=state=>{
 assert.equal(state.request(A,B).ok,true);
 assert.equal(state.respond(B,A,true).ok,true);
};

test('two distinct connected accounts must request and accept, not arbitrary client target ids',()=>{
 const {combat}=make();
 assert.equal(combat.attack(A).reason,'no-active-consensual-duel');
 assert.equal(combat.respond(B,A,true).reason,'no-valid-duel-invitation');
 assert.equal(combat.request(A,A).reason,'invalid-or-disconnected-peer');
 assert.equal(combat.request('forged',B).reason,'invalid-or-disconnected-peer');
 assert.equal(combat.request(A,B).ok,true);
 assert.equal(combat.respond(C,A,true).reason,'no-valid-duel-invitation');
 assert.equal(combat.respond(B,A,false).reason,'duel-declined');
 assert.equal(combat.attack(A).reason,'no-active-consensual-duel');
 start(combat);
 assert.equal(combat.opponents.get(A),B);
 assert.equal(combat.opponents.get(B),A);
 assert.equal(combat.request(C,B).reason,'duel-already-active');
});
test('pending invitations expire and can never be replayed',()=>{
 const {combat,setClock}=make();
 assert.equal(combat.request(A,B).ok,true);
 assert.equal(combat.request(C,B).reason,'target-has-pending-request');
 setClock(70_000);
 assert.equal(combat.respond(B,A,true).reason,'no-valid-duel-invitation');
 assert.equal(combat.request(C,B).ok,true);
 assert.equal(combat.respond(B,C,true).ok,true);
 assert.equal(combat.respond(B,C,true).reason,'no-valid-duel-invitation');
});
test('current client-owned terrain positions cannot enable damage by default',()=>{
 const {combat}=make();start(combat);
 assert.equal(combat.attack(A).reason,'untrusted-terrain-position');
 assert.equal(combat.health.get(B),500);
 assert.equal(combat.lastAttackAt.size,0);
});
test('trusted server positions enforce range, cooldown, safe zones and server-owned HP',()=>{
 const {combat,trustedPositions,setClock}=make({verified:true});start(combat);
 trustedPositions.set(B,{x:700,y:10,z:20});
 assert.equal(combat.attack(A).reason,'target-out-of-range');
 trustedPositions.set(B,{x:201,y:10,z:20});
 assert.deepEqual(combat.attack(A),{ok:true,reason:'server-melee-hit',targetId:B,health:495,downed:false});
 assert.equal(combat.attack(A).reason,'attack-cooldown');
 setClock(40_951);
 assert.equal(combat.attack(A).ok,true);
 assert.equal(combat.health.get(B),490);
 trustedPositions.set(A,{x:0,y:10,z:-30});
 assert.equal(combat.attack(A).reason,'sanctuary-pvp-disabled');
 assert.equal(combat.health.get(B),490);
});
test('only trusted positions, never a caller supplied damage, determine a hit',()=>{
 const {room}=make();const combat=new ServerCombatState({room,now:()=>40_000,trustedPosition:id=>id===A?{x:200,y:10,z:20}:null});
 start(combat);
 assert.equal(combat.attack(A).reason,'untrusted-terrain-position');
 assert.equal(combat.health.get(B),500);
});
test('disconnect removes active duel, health and pending invitations, even after account replacement',()=>{
 const {combat,room}=make({verified:true});start(combat);
 assert.equal(combat.attack(A).ok,true);
 combat.disconnect(B);
 room.members.delete(B);
 assert.equal(combat.attack(A).reason,'no-active-consensual-duel');
 assert.equal(combat.health.has(A),false);
 assert.equal(combat.health.has(B),false);
 assert.equal(combat.opponents.size,0);
 const {combat:more}=make();
 assert.equal(more.request(A,B).ok,true);
 more.disconnect(A);
 assert.equal(more.pending.size,0);
});

test('browser-reported positions cannot override independent trusted collision coordinates',()=>{
 const {combat,room,trustedPositions}=make({verified:true});start(combat);
 trustedPositions.set(B,{x:800,y:10,z:20});
 room.members.get(B).position={x:201,y:10,z:20}; // spoofed near-by browser state
 assert.equal(combat.attack(A).reason,'target-out-of-range');
 assert.equal(combat.health.get(B),500);
});

test('trusted-position provider failures deny damage without changing HP',()=>{
 const {room}=make();
 const combat=new ServerCombatState({room,now:()=>40_000,trustedPosition:()=>{throw Error('terrain unavailable')}});
 start(combat);
 assert.equal(combat.attack(A).reason,'untrusted-terrain-position');
 assert.equal(combat.health.get(B),500);
});
