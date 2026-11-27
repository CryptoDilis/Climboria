// Isolated NPC dialogue engine. Only a trusted room scheduler may call tick with
// authoritative actor snapshots. No socket, client text, human identity or economy imports.
import {getNpcIdentity} from './npc-roster.mjs';
const topics=Object.freeze({
 fish:['The lake is quiet today.','A little patience goes a long way here.'],
 swim:['The water feels refreshing.','The lake is a good place to cool off.'],
 gather:['I am looking for useful wood.','There is plenty to explore around the forest.'],
 farm:['I am tending the crops.','A good harvest takes patience.'],
 rest:['A short rest sounds good.','No need to rush through the hills.'],
 explore:['I wonder what lies beyond this trail.','There is always another trail to explore.']
});
const replies=Object.freeze({
 'calm-explorer':'I agree. I will take my time out here.',
 'competitive-explorer':'Good to know. I am ready for the next challenge.',
 'peaceful-gatherer':'Sounds good. I have a few things to finish nearby.',
 'mountain-explorer':'Interesting. I might look for another path soon.',
 'sociable-swimmer':'Nice! See you around the trails.'
});
const finite=Number.isFinite,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createNpcDialogue({sessionId}={}){
 if(typeof sessionId!=='string'||!/^[a-zA-Z0-9_-]{1,48}$/.test(sessionId))throw Error('NPC dialogue session ID required');
 let lastTime=-1,lastMessage=-Infinity,sequence=0,pending=null,closed=false;
 const lastSpoken=new Map(),variants=new Map();
 function tick(now,actors){
  if(closed||!finite(now)||now<0||now<lastTime||!Array.isArray(actors)||actors.length>5)return null;
  lastTime=now;
  const active=new Map(),duplicates=new Set();
  for(const s of actors){
   const identity=getNpcIdentity(s?.npcId);
   if(!identity||s.kind!=='npc'||s.label!==identity.label||s.closed!==false||
    ![s.x,s.z].every(finite)||Math.abs(s.x)>50000||Math.abs(s.z)>50000)continue;
   if(active.has(identity.id)){duplicates.add(identity.id);continue}
   active.set(identity.id,{identity,x:s.x,z:s.z,mode:s.mode,goal:s.goal,stuck:s.stuck});
  }
  for(const id of duplicates)active.delete(id);
  const eligible=a=>a&&a.stuck===false&&now-(lastSpoken.get(a.identity.id)??-Infinity)>=30000;
  function emit(a,b,text,replyTo=null){
   lastMessage=now;lastSpoken.set(a.identity.id,now);
   return Object.freeze({id:'npc-chat:'+sessionId+':'+(++sequence),kind:'npc',channel:'world',
    npcId:a.identity.id,sender:a.identity.label,targetNpcId:b.identity.id,text,replyTo,createdAt:now});
  }
  if(pending){
   const p=pending,a=active.get(p.from),b=active.get(p.to);
   if(now>p.expires||!a||!b||a.stuck||b.stuck||dist(a,b)>12){pending=null;return null}
   if(now<p.due||now-lastMessage<4000||!eligible(b))return null;
   pending=null;return emit(b,a,replies[b.identity.personality],p.id);
  }
  if(now-lastMessage<12000)return null;
  const candidates=[...active.values()].sort((a,b)=>(lastSpoken.get(a.identity.id)??-Infinity)-(lastSpoken.get(b.identity.id)??-Infinity)||a.identity.id.localeCompare(b.identity.id));
  for(const a of candidates){
   if(!eligible(a)||a.goal!==null||!Object.hasOwn(topics,a.mode))continue;
   const b=candidates.find(v=>v!==a&&eligible(v)&&dist(a,v)<=12);
   if(!b)continue;
   const key=a.identity.id+':'+a.mode,index=variants.get(key)??0,lines=topics[a.mode];
   variants.set(key,(index+1)%lines.length);
   const msg=emit(a,b,lines[index]);
   pending={from:a.identity.id,to:b.identity.id,id:msg.id,due:now+4000,expires:now+15000};
   return msg;
  }
  return null;
 }
 return Object.freeze({tick,close(){closed=true;pending=null;lastSpoken.clear();variants.clear()}});
}
