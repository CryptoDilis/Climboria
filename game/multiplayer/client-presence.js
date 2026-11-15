/* Climboria GAME ONLY. Authenticated remote-presence transport.
 * DISABLED by client-config.json until a real room gateway and two-user QA pass.
 * Never fabricates players, combat damage, loot, wallets or inventory claims.
 */
(async function(){
 'use strict';
 const doc=document.documentElement;
 doc.dataset.climboriaMultiplayer='disabled';
 let config;
 try{const res=await fetch('./multiplayer/client-config.json',{cache:'no-store'});
  if(!res.ok)return;config=await res.json();
 }catch{return}
 if(config?.schema!==1||config?.enabled!==true)return;
 let base;
 try{
  base=new URL(config.endpoint);
  if(base.protocol!=='https:'||base.hostname!=='rooms.climboria.fun'||base.pathname!=='/'||base.username||base.password||base.port)
   throw Error('Unapproved game room endpoint');
 }catch{doc.dataset.climboriaMultiplayer='bad-config';return}
 const auth=window.__CLIMBORIA_GAME_SAVE_CLIENT;
 const renderer=window.__CLIMBORIA_GAME_PEERS;
 const world=window.__climboriaJarrellsPeak;
 if(!auth?.auth?.getSession||!renderer||!world?.player){doc.dataset.climboriaMultiplayer='unavailable';return}
 let socket=null,disposed=false,reconnect=null,movement=null,clientUser=null,selfId=null;
 const known=new Map(),validId=x=>typeof x==='string'&&/^s_[a-f0-9]{32}$/.test(x);
 const validPosition=p=>p&&['x','y','z'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&Math.abs(p[k])<50000);
 const validPlayer=p=>p&&validId(p.id)&&typeof p.name==='string'&&/^[A-Za-z0-9 _-]{2,24}$/.test(p.name)
  &&['Adventurer','Jarrell','Lheiz'].includes(p.model)&&validPosition(p.position);
 let badge=null;
 // Game-only, disabled by the outer client-config release gate. Consent is
 // separate from ATTACK damage: the room NEVER accepts client-requested HP.
 let duelUi=null,duelExpanded=false,inviteFrom=null,outgoingTo=null,activeWith=null;
 let duelNotice='',duelExpiry=null;
 function clearDuelExpiry(){if(duelExpiry){clearTimeout(duelExpiry);duelExpiry=null}}
 function expireDuelRequest(kind,id){
  clearDuelExpiry();
  duelExpiry=setTimeout(()=>{
   if(kind==='incoming'&&inviteFrom===id)inviteFrom=null;
   else if(kind==='outgoing'&&outgoingTo===id)outgoingTo=null;
   else return;
   duelNotice='Invitation expired. Request again if needed.';
   renderDuelUi();
  },30000);
 }
 function duelButton(label,action){
  const button=document.createElement('button');
  button.textContent=label;
  button.style.cssText='margin:4px 5px 4px 0;padding:7px 10px;border:1px solid #d8b46b99;border-radius:7px;background:#202b38;color:#ffe3a3;font:700 11px system-ui;cursor:pointer;touch-action:manipulation';
  button.addEventListener('click',action);
  return button;
 }
 function duelLine(value){
  const line=document.createElement('div');
  line.textContent=value;
  line.style.cssText='margin:4px 0 6px;line-height:1.4';
  return line;
 }
 function renderDuelUi(){
  if(!duelUi)return;
  const panel=duelUi.panel;
  panel.replaceChildren();
  panel.appendChild(duelLine('DUEL INVITATIONS'));
  if(duelNotice)panel.appendChild(duelLine(duelNotice));
  const displayName=id=>known.get(id)?.name||'Explorer';
  if(activeWith&&known.has(activeWith)){
   panel.appendChild(duelLine('Consent recorded with '+displayName(activeWith)+'.'));
   panel.appendChild(duelButton('CANCEL DUEL',()=>{
    if(send({type:'duel-cancel'})){duelNotice='Sending revocation…';renderDuelUi()}
   }));
  }else if(inviteFrom&&known.has(inviteFrom)){
   panel.appendChild(duelLine(displayName(inviteFrom)+' has invited you.'));
   panel.appendChild(duelButton('ACCEPT',()=>{
    if(send({type:'duel-response',challengerId:inviteFrom,accepted:true})){
     duelNotice='Waiting for room confirmation…';renderDuelUi();
    }
   }));
   panel.appendChild(duelButton('DECLINE',()=>{
    if(send({type:'duel-response',challengerId:inviteFrom,accepted:false})){
     duelNotice='Declining invitation…';renderDuelUi();
    }
   }));
  }else if(outgoingTo&&known.has(outgoingTo)){
   panel.appendChild(duelLine('Waiting for '+displayName(outgoingTo)+' to respond.'));
   panel.appendChild(duelButton('CANCEL REQUEST',()=>{
    if(send({type:'duel-cancel'})){duelNotice='Cancelling request…';renderDuelUi()}
   }));
  }else if(known.size===0)panel.appendChild(duelLine('No other explorers connected.'));
  else{
   panel.appendChild(duelLine('Choose a real connected explorer:'));
   for(const [id,peer] of known){
    const row=document.createElement('div');
    row.style.cssText='margin:4px 0;border-top:1px solid #d8b46b33;padding-top:5px';
    row.appendChild(duelLine(peer.name));
    row.appendChild(duelButton('CHALLENGE',()=>{
     if(!validId(id)||!known.has(id))return;
     if(send({type:'duel-request',targetId:id})){
      outgoingTo=id;duelNotice='Waiting for room confirmation…';
      expireDuelRequest('outgoing',id);renderDuelUi();
     }
    }));
    panel.appendChild(row);
   }
  }
  panel.appendChild(duelLine('CONSENT ONLY · PLAYER DAMAGE OFF'));
 }
 function ensureDuelUi(){
  if(!duelUi){
   const toggle=document.createElement('button'),panel=document.createElement('div');
   toggle.id='climboria-duel-toggle';
   toggle.textContent='DUELS';
   toggle.style.cssText='position:fixed;right:10px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:1300;padding:8px 11px;border:1px solid #d8b46b;border-radius:8px;background:#101925f2;color:#ffe3a3;font:800 11px system-ui;cursor:pointer;touch-action:manipulation';
   panel.id='climboria-duel-panel';
   panel.style.cssText='position:fixed;right:10px;bottom:calc(128px + env(safe-area-inset-bottom));width:min(270px,calc(100vw - 20px));max-height:45vh;overflow:auto;z-index:1300;display:none;padding:10px;border:1px solid #d8b46b99;border-radius:9px;background:#070c14f2;color:#ffe3a3;font:700 11px system-ui;box-shadow:0 8px 28px #000a';
   toggle.addEventListener('click',()=>{
    duelExpanded=!duelExpanded;
    panel.style.display=duelExpanded?'block':'none';
    renderDuelUi();
   });
   document.body.appendChild(toggle);document.body.appendChild(panel);
   duelUi={toggle,panel};
  }
  duelUi.toggle.style.display='block';
  renderDuelUi();
 }
 function onDuelPacket(msg){
  if(msg.combatDamageEnabled!==false)return false;
  if(msg.type==='duel-invitation'&&validId(msg.fromId)&&known.has(msg.fromId)){
   inviteFrom=msg.fromId;duelNotice='Invitation expires after 30 seconds.';
   expireDuelRequest('incoming',msg.fromId);
  }else if(msg.type==='duel-request-sent'&&validId(msg.targetId)&&known.has(msg.targetId)){
   outgoingTo=msg.targetId;duelNotice='Invitation sent.';
   expireDuelRequest('outgoing',msg.targetId);
  }else if(msg.type==='duel-response-received'&&validId(msg.fromId)&&
           outgoingTo===msg.fromId&&typeof msg.accepted==='boolean'){
   clearDuelExpiry();activeWith=msg.accepted?msg.fromId:null;outgoingTo=null;
   duelNotice=msg.accepted?'Mutual consent recorded. ATTACK damage remains OFF.':'Invitation declined.';
  }else if(msg.type==='duel-response-sent'&&validId(msg.challengerId)&&
           inviteFrom===msg.challengerId&&typeof msg.accepted==='boolean'){
   clearDuelExpiry();activeWith=msg.accepted?msg.challengerId:null;inviteFrom=null;
   duelNotice=msg.accepted?'Mutual consent recorded. ATTACK damage remains OFF.':'Invitation declined.';
  }else if(msg.type==='duel-cancelled'&&
           (msg.fromId===selfId||(validId(msg.fromId)&&known.has(msg.fromId)))){
   clearDuelExpiry();inviteFrom=null;outgoingTo=null;activeWith=null;
   duelNotice='Duel invitation or consent cancelled.';
  }else return false;
  duelExpanded=true;
  ensureDuelUi();
  duelUi.panel.style.display='block';
  return true;
 }
 function clearDuelUi(){
  clearDuelExpiry();inviteFrom=null;outgoingTo=null;activeWith=null;duelNotice='';
  duelExpanded=false;
  if(duelUi){duelUi.toggle.style.display='none';duelUi.panel.style.display='none';renderDuelUi()}
 }
 function showStatus(value,message){
  doc.dataset.climboriaMultiplayer=value;
  if(!badge){badge=document.createElement('div');badge.id='climboria-room-status';badge.style.cssText=
   'position:fixed;right:8px;bottom:8px;z-index:1100;color:#ffe3a3;background:#070c14df;border:1px solid #d8b46b88;padding:6px 10px;border-radius:8px;font:700 10px system-ui;pointer-events:none';document.body.appendChild(badge)}
  badge.textContent=message;
 }
 function clearPeers(){
  for(const id of known.keys())renderer.remove(id);
  known.clear();selfId=null;
 }
 function addPlayer(player){
  if(!validPlayer(player)||player.id===selfId||known.size>=32)return;
  known.set(player.id,player);renderer.add(player);
  showStatus('connected','ONLINE · '+known.size+' other explorers');
 }
 function leave(id){
  if(!known.has(id))return;
  renderer.remove(id);known.delete(id);
  showStatus('connected','ONLINE · '+known.size+' other explorers');
 }
 function onPacket(data){
  if(typeof data!=='string'||data.length>10000)return;
  let msg;try{msg=JSON.parse(data)}catch{return}
  if(!msg||typeof msg!=='object')return;
  if(msg.type==='welcome'){
   if(!validId(msg.selfId)||!Array.isArray(msg.peers)||msg.peers.length>32)return;
   selfId=msg.selfId;clearPeers();selfId=msg.selfId;
   for(const p of msg.peers)addPlayer(p);
   showStatus('connected','ONLINE · '+known.size+' other explorers');
  }else if(msg.type==='player-joined'){
   addPlayer(msg.player);
  }else if(msg.type==='player-moved'){
   if(validId(msg.id)&&known.has(msg.id)&&validPosition(msg.position)){
    known.get(msg.id).position={x:msg.position.x,y:msg.position.y,z:msg.position.z};
    renderer.move(msg.id,msg.position);
   }
  }else if(msg.type==='player-left')leave(msg.id);
  else if(msg.type==='player-punched'&&validId(msg.id)&&known.has(msg.id))renderer.punch(msg.id);
 }
 function send(packet){
  if(socket?.readyState!==WebSocket.OPEN)return false;
  const message=JSON.stringify(packet);
  if(message.length>512)return false;
  socket.send(message);return true;
 }
 function localPosition(){
  const p=world.player;
  return {x:p.x,y:p.y,z:p.z};
 }
 function isReady(){return window.__climboriaGameReady===true&&world.player.mode==='walk'}
 let previous=null;
 function publishMovement(){
  if(!selfId||!isReady())return;
  const p=localPosition();
  if(!validPosition(p))return;
  if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.035)return;
  if(send({type:'move',position:p}))previous=p;
 }
 async function connect(){
  if(disposed)return;
  if(!isReady()){reconnect=setTimeout(connect,1200);return}
  doc.dataset.climboriaMultiplayer='connecting';
  try{
   const {data,error}=await auth.auth.getSession();
   const session=data?.session;
   if(error||!session?.user?.id||!session.access_token){showStatus('login-required','MULTIPLAYER · SIGN IN REQUIRED');return}
   clientUser=session.user.id;
   const hero=window.__climboriaCreatedHero||{};
   const reply=await fetch(new URL('ticket',base),{
    method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({name:hero.name,model:hero.model})
   });
   if(!reply.ok)throw Error('Room ticket denied');
   const ticket=await reply.json();
   if(!/^[a-f0-9]{64}$/.test(ticket?.ticket||''))throw Error('Invalid room ticket');
   const socketURL=new URL('ws',base);socketURL.protocol='wss:';
   const ws=new WebSocket(socketURL.toString(),['climboria-v1','t-'+ticket.ticket]);
   socket=ws;
   ws.onmessage=e=>onPacket(e.data);
   ws.onopen=()=>{
    if(disposed||!isReady()){ws.close();return}
    previous=null;
    send({type:'spawn',position:localPosition()});
    if(movement)clearInterval(movement);
    movement=setInterval(publishMovement,250);
   };
   ws.onclose=()=>{
    if(socket!==ws)return;
    socket=null;clearPeers();previous=null;
    if(movement){clearInterval(movement);movement=null}
    if(!disposed){showStatus('offline','MULTIPLAYER · RECONNECTING');reconnect=setTimeout(connect,5000)}
   };
   ws.onerror=()=>{if(ws.readyState!==WebSocket.CLOSED)ws.close()};
  }catch(error){
   showStatus('offline','MULTIPLAYER · UNAVAILABLE');
   if(!disposed)reconnect=setTimeout(connect,10000);
  }
 }
 function stop(){
  disposed=true;if(reconnect)clearTimeout(reconnect);if(movement)clearInterval(movement);
  socket?.close();socket=null;clearPeers();
 }
 window.addEventListener('beforeunload',stop,{once:true});
 document.addEventListener('climboria:visual-punch',()=>{if(selfId)send({type:'punch'});});
 const {data:{subscription}={}}=auth.auth.onAuthStateChange((_event,session)=>{
  if(clientUser&&session?.user?.id!==clientUser){
   stop();showStatus('login-required','MULTIPLAYER · SIGN IN REQUIRED');
  }
 });
 void connect();
})();
