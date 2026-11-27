import test from 'node:test';
import assert from 'node:assert/strict';
import {NPC_ROSTER,getNpcIdentity,selectNpcRoster} from './npc-roster.mjs';
test('exact approved names and stable distinct NPC-only IDs',()=>{
 assert.deepEqual(NPC_ROSTER.map(n=>n.name),['Aurelion','KaelVex','Thornevale','VengeancePeak','ZevranSol']);
 assert.equal(new Set(NPC_ROSTER.map(n=>n.id)).size,5);
 assert.equal(new Set(NPC_ROSTER.map(n=>n.seed)).size,5);
 for(const n of NPC_ROSTER){
  assert.equal(n.kind,'npc');assert.equal(n.label,n.name+' [NPC]');
  assert.ok(n.id.startsWith('npc:jarrell-peak:'));assert.equal(getNpcIdentity(n.id),n);
  assert.ok(Object.isFrozen(n)&&Object.isFrozen(n.preferredActivities));
 }
 assert.equal(getNpcIdentity('human:1'),null);assert.equal(getNpcIdentity('Aurelion'),null);
 assert.equal(getNpcIdentity(null),null);
});
test('default one identity and caller-provided tested cap, immutable roster',()=>{
 assert.equal(selectNpcRoster().length,1);assert.equal(selectNpcRoster(0).length,0);
 assert.equal(selectNpcRoster(5).length,5);
 for(const n of [-1,6,1.5,NaN,'5'])assert.throws(()=>selectNpcRoster(n),/cap/);
 assert.ok(Object.isFrozen(NPC_ROSTER)&&Object.isFrozen(selectNpcRoster()));
});
