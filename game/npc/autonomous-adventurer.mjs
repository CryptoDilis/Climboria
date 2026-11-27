// Isolated nonfinancial R5A foundation. No player, socket, economy or renderer imports.
// The caller must supply actor-safe terrain/collision and authored navigation adapters.
import {getNpcIdentity} from './npc-roster.mjs';
const ACTIONS=new Set(['explore','fish','gather','farm','rest','swim']);
const finite=Number.isFinite, dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(a,b)=>a+'>'+b;
export function createAutonomousAdventurer({nodes,edges,spawn,world,seed=1,identityId=null}={}){
 const identity=identityId===null?null:getNpcIdentity(identityId);
 if(identityId!==null&&!identity)throw Error('Unknown NPC identity');
 if(!Array.isArray(nodes)||nodes.length<2||nodes.length>64||!Array.isArray(edges)||edges.length>256||
    typeof world?.sample!=='function'||typeof world?.canTraverse!=='function'||typeof world?.canAct!=='function')
  throw Error('Bounded NPC navigation and world adapters required');
 const graph=new Map(),links=new Map();
 for(const n of nodes){
  if(typeof n?.id!=='string'||!n.id||n.id.length>64||graph.has(n.id)||!finite(n.x)||!finite(n.z)||!ACTIONS.has(n.action))throw Error('Invalid NPC waypoint');
  graph.set(n.id,Object.freeze({id:n.id,x:n.x,z:n.z,action:n.action}));links.set(n.id,[]);
 }
 for(const e of edges){
  if(!Array.isArray(e)||e.length!==2||!graph.has(e[0])||!graph.has(e[1])||e[0]===e[1]||
     dist(graph.get(e[0]),graph.get(e[1]))<.01)throw Error('Invalid NPC edge');
  if(!links.get(e[0]).includes(e[1]))links.get(e[0]).push(e[1]);
 }
 let rng=seed>>>0||1;
 function random(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296}
 function sample(p){
  const s=world.sample(p.x,p.z);
  if(!s||!finite(s.ground)||(s.water!==null&&!finite(s.water)))return null;
  const swim=s.water!==null&&s.ground<s.water-.2;
  return {x:p.x,z:p.z,y:swim?s.water:s.ground,swim};
 }
 let at=spawn,position=graph.has(at)?sample(graph.get(at)):null;
 if(!position)throw Error('Invalid NPC spawn');
 let time=0,stamina=100,mode='idle',goal=null,route=[],next=null,returning=false,wait=0,last=null,closed=false,stuck=false,activity=null;
 const rejected=new Map();
 function pathTo(id){
  const queue=[[at]],seen=new Set([at]);
  for(let i=0;i<queue.length;i++){
   const p=queue[i],end=p.at(-1);if(end===id)return p.slice(1);
   for(const n of links.get(end))if(!seen.has(n)&&(rejected.get(key(end,n))??0)<=time){
    seen.add(n);queue.push([...p,n]);
   }
  }
  return null;
 }
 function choose(){
  let best=null,score=-Infinity;
  for(const n of graph.values()){
   if(n.id===at||world.canAct(n,n.action)!==true)continue;
   const p=pathTo(n.id);if(!p?.length)continue;
   const value=random()*3+(n.action!==last?3:0)+(n.action==='rest'?(100-stamina)/8:0)-p.length*.15;
   if(value>score){score=value;best={id:n.id,path:p}}
  }
  if(!best){mode='idle';wait=.5;return}
  goal=best.id;route=best.path;next=route.shift();returning=false;
 }
 function arrive(){
  if(returning){returning=false;next=null;goal=null;route=[];mode='idle';wait=.2;return}
  at=next;next=route.shift()??null;
  if(next!==null)return;
  const n=graph.get(at),action=n.action;
  if(world.canAct(n,action)!==true||(action==='swim'&&!position.swim)||(['fish','gather','farm','rest'].includes(action)&&position.swim)){
   goal=null;mode='idle';wait=.25;return;
  }
  last=action;mode=action;activity=n;wait=action==='rest'?3:action==='fish'?2+random()*2:action==='farm'?3:1+random();
  goal=null;
 }
 function tick(dt){
  if(closed||!finite(dt)||dt<=0)return snapshot();
  dt=Math.min(dt,.1);time+=dt;
  if(wait>0){wait=Math.max(0,wait-dt);if(mode==='rest')stamina=Math.min(100,stamina+dt*18);
   if(wait===0&&activity){const n=activity;activity=null;if(world.canAct(n,n.action)===true)world.onActivityComplete?.(n,n.action)}return snapshot()}
  if(next===null)choose();
  if(next===null)return snapshot();
  const target=graph.get(next),d=dist(position,target);
  if(d===0){arrive();return snapshot()}
  // Approach activity nodes at walking pace and sample the exact endpoint on
  // the final bounded step, rather than accepting a rounded near-arrival.
  const speed=position.swim?1.6:stamina>65&&d>1?3.2:2;
  const step=Math.min(d,speed*dt,.3),p=sample(step===d?target:{x:position.x+(target.x-position.x)*step/d,z:position.z+(target.z-position.z)*step/d});
  const movement=p?.swim?'swim':p&&!position.swim&&world.isClimb?.(position,p)===true?'climb':speed>2?'run':'walk';
  if(!p||world.canTraverse(position,p,movement)!==true){
   mode='idle';wait=.3;stuck=true;
   if(!returning){rejected.set(key(at,next),time+8);next=at;returning=true;route=[]}
   return snapshot();
  }
  position=p;stuck=false;mode=movement;stamina=Math.max(0,stamina-dt*(movement==='climb'?4:movement==='run'?3:1));
  if(step===d)arrive();
  return snapshot();
 }
 function snapshot(){return Object.freeze({kind:'npc',label:identity?.label??'Adventurer [NPC]',...(identity?{npcId:identity.id}:{}),...position,mode,stamina,goal,stuck,closed})}
 return Object.freeze({tick,snapshot,close(){closed=true;mode='idle';goal=null;next=null;route=[];wait=0;activity=null}});
}
