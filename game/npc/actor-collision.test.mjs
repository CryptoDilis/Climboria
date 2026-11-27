import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Exercise the actual shared functions in play.html, with minimal world fixtures.
// Browser geometry, real terrain, and physical devices remain separate acceptance.
const html=readFileSync(new URL('../play.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function caveWallBlocks('),html.indexOf('function moveWalk('));
function fixture({solids=[],chunks=new Map(),caveWallSegments=[],groundAt=()=>0}={}){
 const window={__climboriaLastCollision:{type:'untouched'}},P={vy:5};
 const factory=new Function('window','P','solids','chunks','caveWallSegments','groundAt','PLAYER_RADIUS','CS','MAX_STEP_UP','SLOPE',source+'\nreturn {actorBlocked,blocked};');
 return {...factory(window,P,solids,chunks,caveWallSegments,groundAt,.5,200,.5,1),window,P};
}
test('NPC query respects own vertical state without changing player diagnostics',()=>{
 const f=fixture({groundAt:x=>x>0?2:0});
 assert.equal(f.actorBlocked(.3,0,0,0,0,0),true);
 assert.deepEqual(f.window.__climboriaLastCollision,{type:'untouched'});
 assert.equal(f.blocked(.3,0,0,0,0),false);
 assert.equal(f.window.__climboriaLastCollision,null);
 f.P.vy=0;assert.equal(f.blocked(.3,0,0,0,0),true);
 assert.ok(f.window.__climboriaLastCollision);
});
test('same fixed, streamed and cave collision without diagnostic leakage',()=>{
 for(const setup of [{solids:[{x:1,z:0,r:.5,label:'pillar'}]},
 {chunks:new Map([['0,0',{col:[{x:1,z:0,r:.5}]}]])},
 {caveWallSegments:[{ax:1,az:-2,bx:1,bz:2,thickness:.1,label:'wall'}]}]){
  const f=fixture(setup),reports=[];
  assert.equal(f.actorBlocked(.8,0,0,0,0,0,v=>reports.push(v)),true);
  assert.ok(reports.at(-1)?.type);
  assert.deepEqual(f.window.__climboriaLastCollision,{type:'untouched'});
  assert.equal(f.blocked(.8,0,0,0,0),true);
  assert.deepEqual(f.window.__climboriaLastCollision,reports.at(-1));
 }
 assert.equal(fixture().actorBlocked(NaN,0,0,0,0,0),true);
});
