// Optional private movement delivery optimization. Only authoritative room positions.
// No filtering of join/leave, chat, combat, snapshots or admission.
export function createMovementInterest(){
 const sent=new Map();
 const key=(source,recipient)=>source.id+'|'+recipient.id;
 const tier=(source,recipient)=>{const a=source.position,b=recipient.position,d=Math.hypot(a.x-b.x,a.z-b.z);return d<=65?0:d<=180?1:2};
 const interval=[0,500,2000];
 function remove(id){for(const [k,v] of sent)if(v.source===id||v.recipient===id)sent.delete(k)}
 function dispatch({members,now,sourceId=null,deliver}){
  if(!Number.isFinite(now))throw Error('Invalid trusted clock');
  const active=[...members.values()].filter(m=>m.visible!==false),failed=new Set();
  let delivered=0,visited=0;
  function pair(source,recipient){
   if(source.id===recipient.id||failed.has(recipient.id))return;
   visited++;
   const k=key(source,recipient),t=tier(source,recipient),old=sent.get(k);
   const changed=!old||old.x!==source.position.x||old.y!==source.position.y||old.z!==source.position.z;
   // Receiver crossing into a nearer tier immediately receives authoritative snapshot,
   // even when the source stopped moving. Periodic flush delivers last suppressed move.
   if(old&&t>=old.tier&&(!changed||now-old.at<interval[t]))return;
   try{deliver(recipient,{type:'player-moved',id:source.id,position:{...source.position}});sent.set(k,{source:source.id,recipient:recipient.id,tier:t,at:now,...source.position});delivered++}
   catch{failed.add(recipient.id)}
  }
  // An individual move checks its outgoing/incoming pairs only (O(n));
  // periodic flush checks all pairs to coalesce and deliver final positions.
  if(sourceId===null){for(const source of active)for(const recipient of active)pair(source,recipient)}
  else{const source=members.get(sourceId);if(source&&source.visible!==false)for(const peer of active){if(peer.id===sourceId)continue;pair(source,peer);pair(peer,source)}}
  return {delivered,visited,failed:[...failed]};
 }
 return Object.freeze({dispatch,remove,size:()=>sent.size});
}
