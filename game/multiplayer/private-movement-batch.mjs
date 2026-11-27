// Private QA projection only. Authentication and session lifecycle are owned by the caller.
// Validate the entire bounded envelope before applying any movement. Never admit a peer.
export function applyPrivateMovementBatch(packet,{hasPeer,move}={}){
 if(typeof hasPeer!=='function'||typeof move!=='function')throw Error('Invalid projection');
 if(!packet||packet.type!=='players-moved'||!Array.isArray(packet.moves)||packet.moves.length<1||packet.moves.length>32)return {ok:false,applied:0};
 const seen=new Set(),entries=[];
 for(const item of packet.moves){
  if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{16,100}$/.test(item.id)||seen.has(item.id))return {ok:false,applied:0};
  const p=item.position;
  if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<50000))return {ok:false,applied:0};
  seen.add(item.id);entries.push({id:item.id,position:{x:p.x,y:p.y,z:p.z}});
 }
 let applied=0;
 for(const item of entries)if(hasPeer(item.id)){move(item.id,item.position);applied++}
 return {ok:true,applied};
}
