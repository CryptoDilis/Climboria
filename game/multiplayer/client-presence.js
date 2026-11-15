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
 let connecting=false,connectEpoch=0,authSubscription=null,spawnConfirmed=false;
 const known=new Map(),validId=x=>typeof x==='string'&&/^s_[a-f0-9]{32}$/.test(x);
 const validPosition=p=>p&&['x','y','z'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&Math.abs(p[k])<50000);
 const validPlayer=p=>p&&validId(p.id)&&typeof p.name==='string'&&/^[A-Za-z0-9 _-]{2,24}$/.test(p.name)
  &&['Adventurer','Jarrell','Lheiz'].includes(p.model)&&validPosition(p.position);
 let badge=null;

 // World Chat never appears without a verified room welcome. Messages are
 // plain text, room-scoped, short-lived in the DOM and never stored locally.
 let chatUi=null,chatExpanded=false;
 function renderChatCount(){
  if(chatUi)chatUi.count.textContent='WORLD CHAT · '+(known.size+(selfId?1:0))+' ONLINE';
 }
 function clearWorldChatUi(){
  chatExpanded=false;
  if(!chatUi)return;
  chatUi.toggle.style.display='none';
  chatUi.panel.style.display='none';
  chatUi.log.replaceChildren();
  chatUi.input.value='';
  chatUi.notice.textContent='';
 }
 function appendWorldChat(msg){
  if(!chatUi||!validId(msg.id)||!(msg.id===selfId||known.has(msg.id))||
     typeof msg.name!=='string'||!(/^[A-Za-z0-9 _-]{2,24}$/.test(msg.name))||
     typeof msg.text!=='string'||![...msg.text].length||[...msg.text].length>160||
     typeof msg.at!=='number'||!Number.isFinite(msg.at))return;
  const line=document.createElement('div');
  line.style.cssText='padding:5px 0;border-bottom:1px solid #d8b46b25;white-space:pre-wrap;overflow-wrap:anywhere';
  line.textContent=msg.name+': '+msg.text;
  const entries=Array.from(chatUi.log.children);
  if(entries.length>=40)chatUi.log.replaceChildren(...entries.slice(-39));
  chatUi.log.appendChild(line);
  chatUi.log.scrollTop=chatUi.log.scrollHeight;
  chatUi.notice.textContent='';
 }
 function sendWorldChat(){
  if(!chatUi||!selfId||!spawnConfirmed)return;
  const text=String(chatUi.input.value||'').trim();
  if(!text||[...text].length>160){
   chatUi.notice.textContent='Enter a message of 1–160 characters.';return;
  }
  if(send({type:'world-chat',text})){
   chatUi.input.value='';
   chatUi.notice.textContent='Sending…';
  }else chatUi.notice.textContent='Not connected. Message not sent.';
 }
 function ensureWorldChatUi(){
  if(!chatUi){
   const mobile=!!document.body.classList?.contains?.('mobile-device');
   const toggle=document.createElement('button'),panel=document.createElement('section');
   const count=document.createElement('div'),log=document.createElement('div');
   const controls=document.createElement('div'),input=document.createElement('input');
   const sendButton=document.createElement('button'),notice=document.createElement('div');
   toggle.id='climboria-world-chat-toggle';toggle.textContent='WORLD CHAT';
   toggle.setAttribute('aria-label','Toggle World Chat');
   toggle.style.cssText='position:fixed;left:10px;z-index:1300;padding:8px 11px;border:1px solid #d8b46b;border-radius:9px;background:#101925f2;color:#ffe3a3;font:800 11px system-ui;cursor:pointer;touch-action:manipulation;'+
    (mobile?'top:140px;':'bottom:18px;');
   panel.id='climboria-world-chat-panel';
   panel.style.cssText='position:fixed;left:10px;z-index:1300;width:min(320px,calc(100vw - 20px));max-height:52dvh;display:none;padding:10px;border:1px solid #d8b46b99;border-radius:10px;background:#070c14f2;color:#ffe3a3;font:600 12px system-ui;box-shadow:0 8px 28px #000a;touch-action:auto;'+
    (mobile?'top:178px;width:min(310px,43vw);':'bottom:62px;');
   count.style.cssText='font-weight:800;letter-spacing:.05em;margin-bottom:6px';
   log.style.cssText='height:112px;max-height:26dvh;overflow-y:auto;overscroll-behavior:contain;font:12px/1.45 system-ui';
   log.setAttribute('role','log');log.setAttribute('aria-live','polite');
   controls.style.cssText='display:flex;gap:6px;margin-top:9px';
   input.type='text';input.maxLength=160;input.placeholder='Message all explorers';
   input.setAttribute('aria-label','World Chat message');
   input.style.cssText='flex:1;min-width:0;padding:8px;border:1px solid #d8b46b88;border-radius:6px;background:#111c29;color:#fff;font:12px system-ui;touch-action:auto';
   sendButton.type='button';sendButton.textContent='SEND';
   sendButton.style.cssText='padding:8px;border:1px solid #d8b46b;border-radius:6px;background:#293547;color:#ffe3a3;font:800 11px system-ui;cursor:pointer';
   notice.style.cssText='min-height:14px;margin-top:5px;font:10px system-ui;color:#e5c98c';
   input.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Enter'){e.preventDefault();sendWorldChat()}
   });
   sendButton.addEventListener('click',sendWorldChat);
   toggle.addEventListener('click',()=>{
    chatExpanded=!chatExpanded;panel.style.display=chatExpanded?'block':'none';
    renderChatCount();
   });
   // Mobile map/joystick gestures must not also move the player's avatar
   // when an explorer scrolls their World Chat transcript.
   panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
   panel.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
   controls.appendChild(input);controls.appendChild(sendButton);
   panel.appendChild(count);panel.appendChild(log);panel.appendChild(controls);panel.appendChild(notice);
   document.body.appendChild(toggle);document.body.appendChild(panel);
   chatUi={toggle,panel,count,log,input,notice};
  }
  chatUi.toggle.style.display='block';renderChatCount();
 }
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
  known.clear();selfId=null;spawnConfirmed=false;clearDuelUi();clearWorldChatUi();
 }
 function addPlayer(player){
  if(!validPlayer(player)||player.id===selfId)return;
  if(known.has(player.id)){
   // A peer may arrive in both welcome and the post-spawn authoritative
   // roster; update its position without allocating a duplicate 3D model.
   known.set(player.id,player);renderer.move(player.id,player.position);
   return;
  }
  if(known.size>=32)return;
  known.set(player.id,player);renderer.add(player);
  renderDuelUi();renderChatCount();
  if(spawnConfirmed)showStatus('connected','ONLINE · '+known.size+' other explorers');
 }
 function leave(id){
  if(!known.has(id))return;
  renderer.remove(id);known.delete(id);
  if([inviteFrom,outgoingTo,activeWith].includes(id)){
   clearDuelExpiry();inviteFrom=null;outgoingTo=null;activeWith=null;
   duelNotice='Explorer disconnected; consent cleared.';
  }
  renderDuelUi();renderChatCount();
  if(spawnConfirmed)showStatus('connected','ONLINE · '+known.size+' other explorers');
 }
 function onPacket(data){
  if(typeof data!=='string'||data.length>10000)return;
  let msg;try{msg=JSON.parse(data)}catch{return}
  if(!msg||typeof msg!=='object')return;
  if(msg.type==='welcome'){
   if(!validId(msg.selfId)||!Array.isArray(msg.peers)||msg.peers.length>32)return;
   selfId=msg.selfId;clearPeers();selfId=msg.selfId;
   for(const p of msg.peers)addPlayer(p);
   // Welcome proves a room ticket, not a valid terrain spawn. Keep chat and
   // duel controls hidden until the server confirms our initial position.
   showStatus('connecting','MULTIPLAYER · JOINING WORLD');
  }else if(msg.type==='spawn-accepted'){
   if(validId(msg.id)&&msg.id===selfId&&validPosition(msg.position)&&
      Array.isArray(msg.peers)&&msg.peers.length<=32){
    // Pending WebSockets intentionally receive no peer join/leave broadcasts.
    // Treat the accepted spawn roster as the complete CURRENT verified set,
    // dropping old welcome ghosts and adding peers spawned during our wait.
    const peers=msg.peers.filter(p=>validPlayer(p)&&p.id!==selfId);
    const verifiedIds=new Set(peers.map(p=>p.id));
    for(const id of [...known.keys()])if(!verifiedIds.has(id))leave(id);
    for(const peer of peers)addPlayer(peer);
    spawnConfirmed=true;
    ensureDuelUi();ensureWorldChatUi();
    showStatus('connected','ONLINE · '+known.size+' other explorers');
   }
  }else if(msg.type==='player-joined'){
   addPlayer(msg.player);
  }else if(msg.type==='player-moved'){
   if(validId(msg.id)&&known.has(msg.id)&&validPosition(msg.position)){
    known.get(msg.id).position={x:msg.position.x,y:msg.position.y,z:msg.position.z};
    renderer.move(msg.id,msg.position);
   }
  }else if(msg.type==='player-left')leave(msg.id);
  else if(msg.type==='world-chat')appendWorldChat(msg);
  else if(msg.type==='rejected'&&msg.reason==='invalid-initial-spawn'){
   showStatus('spawn-rejected','MULTIPLAYER · RETURN TO SANCTUARY');
  }
  else if(msg.type==='rejected'&&['world-chat-rate-limit','world-chat-invalid-text'].includes(msg.reason)){
   if(chatUi)chatUi.notice.textContent=msg.reason==='world-chat-rate-limit'?'Please wait a moment before chatting again.':'Message not accepted. Use 1–160 readable characters.';
  }
  else if(msg.type==='player-punched'&&validId(msg.id)&&known.has(msg.id))renderer.punch(msg.id);
  else if(typeof msg.type==='string'&&msg.type.startsWith('duel-'))onDuelPacket(msg);
  else if(msg.type==='rejected'&&typeof msg.reason==='string'&&
          (msg.reason.startsWith('duel-')||
           ['sanctuary-pvp-disabled','no-valid-duel-invitation',
            'invalid-or-unspawned-peer','invalid-or-disconnected-peer',
            'challenger-has-pending-request','challenger-has-incoming-request',
            'target-has-pending-request','target-has-outgoing-request'].includes(msg.reason))){
   // A server rejection must clear any optimistic waiting state. This also
   // covers a target who disconnects after we clicked CHALLENGE but before
   // the Worker accepts the request.
   clearDuelExpiry();inviteFrom=null;outgoingTo=null;
   duelNotice='Duel action unavailable. Check proximity, cooldown or invitation expiry.';
   renderDuelUi();
  }
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
  if(!selfId||!spawnConfirmed||!isReady())return;
  const p=localPosition();
  if(!validPosition(p))return;
  if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.035)return;
  if(send({type:'move',position:p}))previous=p;
 }
 // Auth transitions must not permanently disable presence. Keep the
 // explicit config.enabled release gate above; this runs only on approved rooms.
 function scheduleConnect(delay){
  if(disposed||socket)return;
  if(reconnect)clearTimeout(reconnect);
  reconnect=setTimeout(()=>{reconnect=null;void connect()},delay);
 }
 function resetConnection(){
  // Invalidate pending getSession/ticket responses so a signed-out account
  // cannot later create a socket or revive its World Chat after logout.
  connectEpoch++;
  connecting=false;
  if(reconnect){clearTimeout(reconnect);reconnect=null}
  if(movement){clearInterval(movement);movement=null}
  const old=socket;socket=null;previous=null;
  if(old){try{old.close()}catch{}}
  clearPeers();
 }
 async function connect(){
  if(disposed||connecting||socket)return;
  if(!isReady()){scheduleConnect(1200);return}
  connecting=true;
  const epoch=++connectEpoch;
  doc.dataset.climboriaMultiplayer='connecting';
  try{
   const {data,error}=await auth.auth.getSession();
   if(disposed||epoch!==connectEpoch)return;
   const session=data?.session;
   // Supabase anonymous sign-in returns a real UUID and bearer token.
   // Only registered accounts may join the authenticated Game room.
   if(error||!session?.user?.id||!session.access_token||
      session.user.is_anonymous===true||
      session.user.app_metadata?.provider==='anonymous'){
    clientUser=null;showStatus('login-required','MULTIPLAYER · SIGN IN REQUIRED');return;
   }
   clientUser=session.user.id;
   const hero=window.__climboriaCreatedHero||{};
   const reply=await fetch(new URL('ticket',base),{
    method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({name:hero.name,model:hero.model})
   });
   if(disposed||epoch!==connectEpoch)return;
   if(!reply.ok)throw Error('Room ticket denied');
   const ticket=await reply.json();
   if(disposed||epoch!==connectEpoch)return;
   if(!/^[a-f0-9]{64}$/.test(ticket?.ticket||''))throw Error('Invalid room ticket');
   const socketURL=new URL('ws',base);socketURL.protocol='wss:';
   const ws=new WebSocket(socketURL.toString(),['climboria-v1','t-'+ticket.ticket]);
   socket=ws;
   ws.onmessage=e=>{if(!disposed&&socket===ws&&epoch===connectEpoch)onPacket(e.data)};
   ws.onopen=()=>{
    if(disposed||socket!==ws||epoch!==connectEpoch||!isReady()){ws.close();return}
    previous=null;
    send({type:'spawn',position:localPosition()});
    if(movement)clearInterval(movement);
    movement=setInterval(publishMovement,250);
   };
   ws.onclose=()=>{
    if(socket!==ws||disposed||epoch!==connectEpoch)return;
    socket=null;clearPeers();previous=null;
    if(movement){clearInterval(movement);movement=null}
    showStatus('offline','MULTIPLAYER · RECONNECTING');
    scheduleConnect(5000);
   };
   ws.onerror=()=>{if(ws.readyState!==WebSocket.CLOSED)ws.close()};
  }catch(error){
   if(disposed||epoch!==connectEpoch)return;
   showStatus('offline','MULTIPLAYER · UNAVAILABLE');
   scheduleConnect(10000);
  }finally{
   if(epoch===connectEpoch)connecting=false;
  }
 }
 function stop(){
  if(disposed)return;
  disposed=true;
  resetConnection();
  authSubscription?.unsubscribe?.();
 }
 window.addEventListener('beforeunload',stop,{once:true});
 document.addEventListener('climboria:visual-punch',()=>{if(selfId)send({type:'punch'});});
 authSubscription=auth.auth.onAuthStateChange((_event,session)=>{
  if(disposed)return;
  // Guest JWTs must behave like signed-out state even when Supabase returns
  // a valid user.id. This also closes any prior registered user's socket on
  // a switch to an anonymous login, removing stale 3D peers and World Chat.
  const verifiedUser=session?.user?.is_anonymous===true||
    session?.user?.app_metadata?.provider==='anonymous'
    ?null:(session?.user?.id||null);
  if(!verifiedUser){
   // Logout must remove ghosts, transcript and socket immediately, without
   // forbidding the next independent login on this open Game page.
   if(clientUser||socket||connecting)resetConnection();
   clientUser=null;
   showStatus('login-required','MULTIPLAYER · SIGN IN REQUIRED');
   return;
  }
  if(clientUser&&clientUser!==verifiedUser){
   // A different authenticated user must NEVER inherit the old room socket.
   resetConnection();clientUser=null;
  }else if(connecting&&!clientUser){
   // Auth initialized or switched while getSession() was unresolved. Invalidate
   // its possible stale result and obtain a fresh session for this login.
   resetConnection();
  }
  if(!socket&&!connecting)scheduleConnect(0);
 })?.data?.subscription;
 void connect();
})();
