import assert from 'node:assert/strict';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {WebSocket,WebSocketServer} from 'ws';
import {PresenceRoom} from '../../game/multiplayer/presence-room.mjs';
const id=i=>'session_'+String(i).padStart(18,'0');
const wait=async(fn,label,ms=30000)=>{const end=performance.now()+ms;while(!fn()){if(performance.now()>end)throw Error(label);await new Promise(r=>setTimeout(r,5))}};
async function scenario(n,distributed,optimized,batched=false){
 let now=1000,seq=0,wireBytes=0,movePackets=0,moveEntries=0,serverError=null;
 const room=new PresenceRoom({roomId:'private-crowd-fixture',now:()=>now,limit:n,movementInterest:optimized,movementBatch:batched});
 const wss=new WebSocketServer({host:'127.0.0.1',port:0,maxPayload:1024,perMessageDeflate:false});
 const sockets=new Map(),clients=[],rtts=[],start=performance.now();
 const initial=i=>({x:i*(distributed?12:.3),y:2,z:-30});
 wss.on('connection',socket=>{
  const i=seq++,sid=id(i);sockets.set(sid,socket);
  const send=packet=>{if(socket.readyState!==WebSocket.OPEN)throw Error('Closed fixture socket');const raw=JSON.stringify(packet);wireBytes+=Buffer.byteLength(raw);if(packet.type==='player-moved'){movePackets++;moveEntries++}if(packet.type==='players-moved'){movePackets++;moveEntries+=packet.moves.length}socket.send(raw)};
  const joined=room.connect({trustedSessionId:sid,name:'QA '+i,model:'Jarrell',announceImmediately:false,send});
  if(!joined.ok){serverError=Error(joined.reason);socket.close();return}
  room.members.get(sid).position=initial(i);room.announce(sid);
  socket.send(JSON.stringify({type:'fixture-ready',index:i}));
  socket.on('message',raw=>{try{
   const msg=JSON.parse(raw);const result=room.receive(sid,msg);
   socket.send(JSON.stringify({type:'fixture-ack',step:msg.step,ok:result.ok,reason:result.reason??null}));
  }catch(error){serverError=error}});
  socket.on('close',()=>{sockets.delete(sid);room.disconnect(sid)});
  socket.on('error',e=>{serverError=e});
 });
 await once(wss,'listening');
 try{
  for(let i=0;i<n;i++){
   const ws=new WebSocket('ws://127.0.0.1:'+wss.address().port,{perMessageDeflate:false});
   const c={ws,index:null,ack:0,positions:new Map(),barrier:false,error:null,sentAt:0};
   clients.push(c);
   ws.on('error',e=>{c.error=e});
   ws.on('message',raw=>{try{
    const m=JSON.parse(raw);
    if(m.type==='fixture-ready')c.index=m.index;
    if(m.type==='fixture-ack'){assert.ok(m.ok,m.reason);c.ack=m.step;rtts.push(performance.now()-c.sentAt)}
    if(m.type==='welcome')for(const p of m.peers)c.positions.set(p.id,p.position);
    if(m.type==='player-joined')c.positions.set(m.player.id,m.player.position);
    if(m.type==='player-moved')c.positions.set(m.id,m.position);
    if(m.type==='players-moved'){assert.ok(batched);assert.ok(m.moves.length>0&&m.moves.length<=32);for(const p of m.moves)c.positions.set(p.id,p.position)}
    if(m.type==='player-left')c.positions.delete(m.id);
    if(m.type==='fixture-barrier')c.barrier=true;
   }catch(e){c.error=e}});
   await wait(()=>c.index!==null||c.error,'ready timeout');if(c.error)throw c.error;
  }
  assert.equal(room.snapshot().length,n);assert.equal(sockets.size,n);
  room.flushMovementInterest();wireBytes=0;movePackets=0;moveEntries=0;
  for(let step=1;step<=12;step++){
   now+=250;
   for(const c of clients){
    const pos=initial(c.index);pos.x+=step*.25;c.sentAt=performance.now();
    c.ws.send(JSON.stringify({type:'move',step,id:id((c.index+1)%n),position:pos}));
   }
   await wait(()=>serverError||clients.some(c=>c.error)||clients.every(c=>c.ack===step),'movement ack timeout');
   if(serverError)throw serverError;for(const c of clients)if(c.error)throw c.error;
   room.flushMovementInterest();
  }
  now+=2000;room.flushMovementInterest();
  for(const socket of sockets.values())socket.send(JSON.stringify({type:'fixture-barrier'}));
  await wait(()=>clients.every(c=>c.barrier)||clients.some(c=>c.error),'final position barrier timeout');
  for(const c of clients){
   if(c.error)throw c.error;
   assert.equal(c.positions.size,n-1);
   for(let i=0;i<n;i++)if(i!==c.index)assert.deepEqual(c.positions.get(id(i)),{...initial(i),x:initial(i).x+3});
  }
  assert.equal(room.members.size,n);
  const count=movePackets,bytes=wireBytes;
  for(const c of clients)c.ws.close();
  await wait(()=>room.members.size===0&&sockets.size===0,'disconnect cleanup timeout');
  assert.equal(room.movementInterest?.size()??0,0);
  const sorted=[...rtts].sort((a,b)=>a-b);
  return {n,distributed,optimized,batched,moveEntries,movePackets:count,wireBytes:bytes,ackP95Ms:sorted[Math.ceil(sorted.length*.95)-1],elapsedMs:performance.now()-start,heapUsedBytes:process.memoryUsage().heapUsed,finalPositions:true,cleanup:true};
 }finally{
  for(const c of clients)c.ws.terminate();
  for(const socket of wss.clients)socket.terminate();
  await new Promise(resolve=>wss.close(resolve));
 }
}
for(const n of [10,25,50,100])for(const distributed of [false,true]){
 const baseline=await scenario(n,distributed,false),optimized=await scenario(n,distributed,true);
 assert.equal(baseline.movePackets,12*n*(n-1));
 if(distributed&&n>=25)assert.ok(optimized.movePackets<baseline.movePackets);
 assert.ok(optimized.movePackets<=baseline.movePackets+ n*(n-1));
 console.log('Private native crowd socket evidence',JSON.stringify({baseline,optimized,ratio:optimized.movePackets/baseline.movePackets}));
 const batched=await scenario(n,distributed,true,true);
 assert.ok(batched.movePackets<=optimized.movePackets);
 if(!distributed){assert.equal(batched.moveEntries,baseline.moveEntries);assert.equal(batched.movePackets,12*n*Math.ceil((n-1)/32));assert.ok(batched.wireBytes<baseline.wireBytes)}
 console.log('Private native batch evidence',JSON.stringify({n,distributed,batched,packetRatio:batched.movePackets/baseline.movePackets,byteRatio:batched.wireBytes/baseline.wireBytes}));
}
