// Private server-side room bridge. Never call from a client packet handler.
// Actor factory and clock are trusted server dependencies, not user inputs.
import {createNpcDialogue} from './npc-dialogue.mjs';
import {selectNpcRoster} from './npc-roster.mjs';
export function createNpcRoomDialogue({enabled=false,room,sessionId,createActor}={}){
 if(enabled!==true)return Object.freeze({tick:()=>null,close:()=>{},audit:()=>({enabled:false,actors:0,emitted:0})});
 if(typeof room?.broadcast!=='function'||typeof room?.snapshot!=='function'||typeof createActor!=='function')throw Error('Trusted room and actor factory required');
 // Two-actor isolated pilot, not a public admission setting.
 const identities=[selectNpcRoster(1)[0],selectNpcRoster(5)[4]],actors=[];
 const dialogue=createNpcDialogue({sessionId});
 let closed=false,last=-Infinity,emitted=0;
 try{
  for(const identity of identities){
   const actor=createActor(identity);
   if(!actor||typeof actor.tick!=='function'||typeof actor.close!=='function'||typeof actor.snapshot!=='function')throw Error('Invalid server NPC actor');
   actors.push(actor);
   const s=actor.snapshot();if(s?.kind!=='npc'||s.npcId!==identity.id||s.label!==identity.label||s.closed!==false)throw Error('Server NPC identity mismatch');
  }
 }catch(error){dialogue.close();for(const a of actors)a.close();throw error}
 function close(){if(closed)return;closed=true;dialogue.close();for(const a of actors)a.close()}
 function tick(now){
  if(closed||!Number.isSafeInteger(now)||now<0||now-last<100)return null;
  if(!room.snapshot().length)return null; // no visible real recipients, no actor work
  last=now;
  try{
   const snapshots=actors.map(a=>a.tick(.1));
   if(snapshots.some((s,i)=>s?.kind!=='npc'||s.npcId!==identities[i].id||s.label!==identities[i].label||s.closed!==false))throw Error('Server NPC identity changed');
   const event=dialogue.tick(now,snapshots);
   if(!event)return null;
   // Dedicated server-only packet type; never human world-chat or presence.
   const packet=Object.freeze({type:'npc-world-chat',messageId:event.id,kind:'npc',npcId:event.npcId,
    name:event.sender,text:event.text,targetNpcId:event.targetNpcId,replyTo:event.replyTo,at:event.createdAt});
   room.broadcast(packet);emitted++;return packet;
  }catch(error){close();throw error}
 }
 return Object.freeze({tick,close,audit:()=>Object.freeze({enabled:!closed,actors:closed?0:actors.length,emitted})});
}
