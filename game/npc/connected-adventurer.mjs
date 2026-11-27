// Compose existing verified activity adapters into one NPC, never teleport between graphs.
// Smoke candidate only. Caller owns loaded terrain and admission; no public spawn or real resources.
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
import {createJarrellLakeAdventurer} from './jarrell-lake-adventurer.mjs';
import {createForestGatherer} from './forest-gatherer.mjs';
import {findConnectedNpcRoute} from './connected-route.mjs';
export function createConnectedAdventurer({groundAt,waterBodyAt,actorBlocked,loaded,fishingSpots,lake,logSpots,forestCenter,identityId=null,seed,personalityEnabled=false,routeOptions={}}={}){
 const adapters={groundAt,waterBodyAt,actorBlocked,loaded};
 let l,f;
 try{
  l=createJarrellLakeAdventurer({...adapters,fishingSpots,lake,seed});
  f=createForestGatherer({...adapters,logSpots,center:forestCenter,seed});
 }finally{l?.npc.close();f?.npc.close()}
 const start=l.nodes.find(n=>n.id==='rest'),end=f.nodes.find(n=>n.id==='rest');
 // Only connector options affecting search bounds may be supplied; world adapters are not replaceable.
 const {grid,maxExpanded,maxProbes,maxWaypoints}=routeOptions;
 const route=findConnectedNpcRoute({start,end,sample:l.world.sample,canTraverse:l.world.canTraverse,grid,maxExpanded,maxProbes,maxWaypoints});
 if(!route.points)throw Error('No verified connected activity route: '+JSON.stringify({reason:route.reason,probes:route.probes,expanded:route.expanded}));
 const nodes=[],edges=[],original=new Map(),seen=new Set();
 const add=(prefix,part)=>{
  for(const n of part.nodes){const id=prefix+':'+n.id;nodes.push({...n,id});original.set(id,{n,world:part.world})}
  for(const [a,b] of part.edges)edges.push([prefix+':'+a,prefix+':'+b]);
 };
 add('lake',l);add('forest',f);
 const chain=['lake:rest'];
 for(const [i,p] of route.points.slice(1,-1).entries()){
  const id='transit:'+i;nodes.push({id,...p,action:'explore'});chain.push(id);
 }
 chain.push('forest:rest');
 for(let i=1;i<chain.length;i++)edges.push([chain[i-1],chain[i]],[chain[i],chain[i-1]]);
 const meaningful=new Set(['fish','swim','gather']);
 const world={
  sample:l.world.sample,canTraverse:l.world.canTraverse,
  canAct(n,action){const o=original.get(n.id);return !!o&&o.world.canAct(o.n,action)===true},
  // Encourage variety, not a scripted order. Rest utility and random choice remain in the controller.
  goalBias(n){return meaningful.has(n.action)&&!seen.has(n.action)?10:0},
  onActivityComplete(n,action){
   const o=original.get(n.id);if(!o||o.world.canAct(o.n,action)!==true)return;
   o.world.onActivityComplete?.(o.n,action);seen.add(action);
  }
 };
 const npc=createAutonomousAdventurer({nodes,edges,spawn:'lake:rest',world,seed:seed??(personalityEnabled?undefined:17),identityId,personalityEnabled});
 return Object.freeze({npc,route,source:f.source,nodes:Object.freeze(nodes.map(n=>Object.freeze({...n}))),
  audit:()=>Object.freeze({completed:Object.freeze([...seen]),resources:f.audit(),connectorProbes:route.probes})});
}
