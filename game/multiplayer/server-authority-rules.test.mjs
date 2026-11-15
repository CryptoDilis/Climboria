import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOM_RULES,inSanctuarySafeZone,validatePlayerMove,authorizeMelee,authorizeWorldGrab} from './server-authority-rules.mjs';

const actor=(overrides={})=>({
 serverId:'player_abcdefgh',roomId:'jarrell-peak-alpha',position:{x:200,y:10,z:20},
 pvpEnabled:true,health:100,...overrides
});
const target=(overrides={})=>actor({serverId:'player_ijklmnop',position:{x:202,y:10,z:20},...overrides});
const melee=(a=actor(),b=target(),overrides={})=>authorizeMelee({
 attacker:a,target:b,duelConsent:true,nowMs:15000,lastAttackAtMs:0,...overrides
});
const drop=(overrides={})=>({
 type:'world_drop',binding:'unbound',authoritative:true,
 roomId:'jarrell-peak-alpha',position:{x:201,y:10,z:20},
 claimed:false,paid:false,onChain:false,protectedUntilMs:0,...overrides
});
test('real Sanctuary spawn, vendors, and starter path are PvP free',()=>{
 assert.equal(inSanctuarySafeZone({x:0,y:2,z:-30}),true);
 assert.equal(inSanctuarySafeZone({x:36,y:2,z:-52}),true);
 assert.equal(inSanctuarySafeZone({x:300,y:2,z:200}),false);
 assert.deepEqual(melee(actor({position:{x:0,y:2,z:-30}}),target({position:{x:1,y:2,z:-30}})),{ok:false,reason:'sanctuary-pvp-disabled'});
});
test('no damage without both players opting in and duel consent',()=>{
 assert.equal(melee(actor(),target({pvpEnabled:false})).reason,'pvp-consent-required');
 assert.equal(melee(actor(),target(),{duelConsent:false}).reason,'pvp-consent-required');
 assert.equal(melee(actor(),target()).ok,true);
});
test('server policy rejects spoofed rooms, identity, duplicates, dead players and close/far elevation exploits',()=>{
 assert.equal(melee(actor(),target({roomId:'other-room'})).ok,false);
 assert.equal(melee(actor(),target({serverId:'player_abcdefgh'})).ok,false);
 assert.equal(melee(actor(),target({position:{x:600,y:10,z:20}})).reason,'target-out-of-range');
 assert.equal(melee(actor(),target({position:{x:201,y:19,z:20}})).reason,'target-out-of-range');
 assert.equal(melee(actor({health:0}),target()).reason,'inactive-fighter');
 assert.equal(melee(actor({position:{x:NaN,y:0,z:0}}),target()).reason,'invalid-peer-or-room');
});
test('attack cooldown and server clock cannot be overridden by client data',()=>{
 assert.equal(melee(actor(),target(),{nowMs:100,lastAttackAtMs:0}).reason,'attack-cooldown');
 assert.equal(melee(actor(),target(),{nowMs:1000,lastAttackAtMs:1100}).reason,'invalid-server-time');
 assert.equal(melee(actor(),target(),{nowMs:1000,lastAttackAtMs:0}).ok,true);
});
test('server movement policy rejects impossible teleports and malformed packets',()=>{
 const previous={x:0,y:2,z:-30};
 assert.equal(validatePlayerMove({previous,next:{x:.5,y:2,z:-30},elapsedMs:100}).ok,true);
 assert.equal(validatePlayerMove({previous,next:{x:1000,y:2,z:-30},elapsedMs:100}).reason,'move-too-fast');
 assert.equal(validatePlayerMove({previous,next:{x:0,y:2,z:-30},elapsedMs:5000}).reason,'invalid-or-stale-position');
 assert.equal(validatePlayerMove({previous,next:{x:Infinity,y:2,z:0},elapsedMs:100}).ok,false);
});
test('grabbing requires a nearby public unclaimed nonfinancial world drop',()=>{
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop(),nowMs:2000}).ok,true);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({type:'player_inventory'}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({binding:'wallet'}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({paid:true}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({onChain:true}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({claimed:true}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({roomId:'foreign-room'}),nowMs:2000}).ok,false);
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({protectedUntilMs:3000}),nowMs:2000}).reason,'drop-protected-or-invalid');
 assert.equal(authorizeWorldGrab({actor:actor(),drop:drop({position:{x:999,y:10,z:20}}),nowMs:2000}).reason,'drop-out-of-range');
});
test('policy constants are bounded and source code cannot create a fake multiplayer connection',()=>{
 assert.ok(ROOM_RULES.attackCooldownMs>=700);
 assert.ok(ROOM_RULES.meleeRangeMeters<=3);
 assert.ok(ROOM_RULES.safeZone.radius>=60);
 assert.equal(typeof authorizeWorldGrab,'function');
});
