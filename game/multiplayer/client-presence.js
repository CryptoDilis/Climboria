/* Climboria GAME ONLY. Authenticated remote-presence transport.
 * Public registered-only pilot is controlled by client-config.json.
 * Never fabricates players, combat damage, loot, wallets or inventory claims.
 */
(async function(){
 'use strict';
 const doc=document.documentElement;
 let badge=null;
 showStatus('checking','MULTIPLAYER · CHECKING SERVER');
 // Transient CDN/network failures must not strand an otherwise healthy Game.
 // Bound fetch AND JSON parsing; retry slowly until a valid config arrives or
 // the page is left. Never assume a room exists or enable one on failed reads.
 let config,configCancelled=false;
 window.addEventListener('pagehide',()=>{configCancelled=true},{once:true});
 for(let attempt=0;!configCancelled;attempt++){
  const abort=new AbortController();
  let deadlineTimer;
  try{
   const work=(async()=>{
    const res=await fetch('./multiplayer/client-config.json',{
     cache:'no-store',signal:abort.signal
    });
    if(!res.ok)throw Error('Game multiplayer config unavailable');
    return res.json();
   })();
   const deadline=new Promise((_,reject)=>{
    deadlineTimer=setTimeout(()=>{
     abort.abort();
     reject(Error('Game multiplayer config deadline expired'));
    },8000);
   });
   config=await Promise.race([work,deadline]);
   break;
  }catch{
   clearTimeout(deadlineTimer);
   showStatus('config-unavailable','MULTIPLAYER · ROOM SETTINGS UNAVAILABLE · RETRYING');
   await new Promise(resolve=>setTimeout(resolve,attempt<2?600:3000));
  }finally{clearTimeout(deadlineTimer)}
 }
 if(configCancelled)return;
 if(config?.schema!==1){
  showStatus('config-unavailable','MULTIPLAYER · SETTINGS UNAVAILABLE · RELOAD');
  return;
 }
 if(config?.enabled!==true){
  showStatus('disabled','MULTIPLAYER · CURRENTLY OFFLINE');
  return;
 }
 let base;
 try{
  base=new URL(config.endpoint);
  if(base.protocol!=='https:'||base.hostname!=='rooms.climboria.fun'||base.pathname!=='/'||base.username||base.password||base.port)
   throw Error('Unapproved game room endpoint');
 }catch{showStatus('bad-config','MULTIPLAYER · INVALID ROOM SETTINGS');return}
 // Game and Supabase are loaded by separate scripts. A slow provider/CDN or
 // 3D boot must not permanently skip multiplayer for this entire page load.
 // Retry only approved first-party dependencies; never generate a fake peer.
 const dependencies=()=>{
  const auth=window.__CLIMBORIA_GAME_SAVE_CLIENT;
  const renderer=window.__CLIMBORIA_GAME_PEERS;
  const world=window.__climboriaJarrellsPeak;
  return auth?.auth?.getSession&&auth.auth.onAuthStateChange&&
   renderer?.add&&renderer?.remove&&world?.player
   ?{auth,renderer,world}:null;
 };
 let readyClients=dependencies();
 if(!readyClients){
  showStatus('starting','MULTIPLAYER · LOADING GAME & LOGIN');
  let cancelled=false;
  window.addEventListener('pagehide',()=>{cancelled=true},{once:true});
  // Slow Android/WebGL/CDN starts can exceed 30s. Do not permanently
  // disable real room and World Chat after a timer if dependencies arrive
  // later. Back off to one inexpensive read every 3s while this page lives.
  for(let attempt=0;!readyClients&&!cancelled;attempt++){
   if(attempt===60)
    showStatus('slow-start','MULTIPLAYER · STILL LOADING GAME & LOGIN · RETRYING');
   await new Promise(resolve=>setTimeout(resolve,attempt<60?500:3000));
   if(cancelled)return;
   readyClients=dependencies();
  }
  if(cancelled)return;
 }
 const {auth,renderer,world}=readyClients;
 let socket=null,disposed=false,reconnect=null,movement=null,clientUser=null,selfId=null;
 let connecting=false,connectEpoch=0,authSubscription=null,spawnConfirmed=false;
 let sameAccountInUse=false;
 let admissionTimer=null;
 let sessionLookupCancel=null;
 const known=new Map(),validId=x=>typeof x==='string'&&/^s_[a-f0-9]{32}$/.test(x);
 const validPosition=p=>p&&['x','y','z'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&Math.abs(p[k])<50000);
 const validPlayer=p=>p&&validId(p.id)&&typeof p.name==='string'&&/^[A-Za-z0-9 _-]{2,24}$/.test(p.name)
  &&['Adventurer','Jarrell','Lheiz'].includes(p.model)&&validPosition(p.position);
 // World Chat never appears without a verified room welcome. Messages are
 // plain text, room-scoped, short-lived in the DOM and never stored locally.
 let chatUi=null,chatExpanded=false,pendingWorldChat=null,worldChatSequence=0;
 function clearPendingWorldChat(){
  if(pendingWorldChat?.timeout)clearTimeout(pendingWorldChat.timeout);
  pendingWorldChat=null;
 }
 function renderChatCount(){
  if(chatUi)chatUi.count.textContent='WORLD CHAT · '+(known.size+(selfId?1:0))+' ONLINE';
 }
 function clearWorldChatUi(){
  chatExpanded=false;
  // Clear drafts on sign-out/disconnect to avoid leaking text between
  // authenticated accounts or reviving messages after room reconnection.
  clearPendingWorldChat();
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
  // Only the authoritative server echo from our own room identity confirms
  // delivery. Never erase a draft merely because WebSocket.send succeeded,
  // or because another explorer spoke while our message is pending.
  if(pendingWorldChat && msg.id===selfId &&
     msg.chatSeq===pendingWorldChat.chatSeq && msg.text===pendingWorldChat.text){
   const confirmed=pendingWorldChat;
   clearPendingWorldChat();
   if(String(chatUi.input.value||'').trim().normalize('NFC')===confirmed.text)
    chatUi.input.value='';
   chatUi.notice.textContent='';
  }else if(!pendingWorldChat){
   chatUi.notice.textContent='';
  }
 }
 function sendWorldChat(){
  if(!chatUi||!selfId||!spawnConfirmed)return;
  if(pendingWorldChat){
   chatUi.notice.textContent='Waiting for the server to confirm the previous message.';
   return;
  }
  // Match the trusted room's Unicode normalization, control-character
  // rejection and 384-byte UTF-8 budget before clearing the input.
  // Otherwise a message that looks <=160 characters could be rejected
  // server-side after the explorer has already lost their typed text.
  const text=String(chatUi.input.value||'').trim().normalize('NFC');
  const forbidden=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
  if(!text||[...text].length>160||forbidden.test(text)||
     new TextEncoder().encode(text).byteLength>384){
   chatUi.notice.textContent='Use 1–160 readable characters (max 384 UTF-8 bytes).';
   return;
  }
  // Match only an echo carrying this exact request sequence. Text and self ID
  // alone are insufficient: a late echo after an 8-second timeout could
  // otherwise falsely acknowledge a new retry of identical text.
  worldChatSequence=worldChatSequence>=2147483647?1:worldChatSequence+1;
  const chatSeq=worldChatSequence;
  if(send({type:'world-chat',text,chatSeq})){
   const pending={text,chatSeq,timeout:null};
   pendingWorldChat=pending;
   chatUi.notice.textContent='Sending… awaiting room confirmation';
   // The room normally sends either a broadcast echo or an explicit reject.
   // Avoid locking the compose box forever if the server never responds.
   // Do not automatically resend: late echoes could otherwise duplicate chat.
   pending.timeout=setTimeout(()=>{
    if(pendingWorldChat!==pending)return;
    pendingWorldChat=null;
    if(chatUi)chatUi.notice.textContent=
     'Not confirmed. Check the transcript before sending again.';
   },8000);
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
 let returnToSanctuaryButton=null,sameAccountRetryButton=null;
 function showStatus(value,message){
  doc.dataset.climboriaMultiplayer=value;
  if(!badge){badge=document.createElement('div');badge.id='climboria-room-status';badge.style.cssText=
   'position:fixed;right:8px;bottom:8px;z-index:1600;max-width:min(280px,80vw);color:#ffe3a3;background:#070c14f2;border:1px solid #d8b46bcc;padding:9px 12px;border-radius:9px;box-shadow:0 4px 16px #000a;font:700 12px/1.45 system-ui;pointer-events:none';document.body.appendChild(badge)}
  badge.textContent=message;
  if(value==='awaiting-sanctuary'||value==='spawn-rejected'){
   // Mobile explorers have no physical Digit1 key. Reuse the same local
   // Sanctuary teleport as the keyboard, but ONLY on an explicit click.
   // This is a local player control, never a forged multiplayer spawn.
   if(!returnToSanctuaryButton){
    returnToSanctuaryButton=document.createElement('button');
    returnToSanctuaryButton.id='climboria-room-return-sanctuary';
    returnToSanctuaryButton.type='button';
    returnToSanctuaryButton.textContent='RETURN TO SANCTUARY';
    returnToSanctuaryButton.style.cssText='display:block;width:100%;margin-top:8px;padding:9px 11px;border:1px solid #d8b46b;border-radius:8px;background:#253448;color:#ffe3a3;font:800 11px/1.35 system-ui;cursor:pointer;pointer-events:auto;touch-action:manipulation';
    returnToSanctuaryButton.addEventListener('click',event=>{
     event?.stopPropagation?.();
     if(doc.dataset.climboriaMultiplayer!=='awaiting-sanctuary'&&
        doc.dataset.climboriaMultiplayer!=='spawn-rejected')return;
     document.dispatchEvent(new Event('climboria:room-return-to-sanctuary'));
    });
   }
   badge.appendChild(returnToSanctuaryButton);
  }
  if(value==='same-account-in-use'){
   // The room enforces one live socket per real Supabase user ID.
   // A second browser using a linked login method replaces the first.
   // Never endlessly fight that other tab every five seconds.
   if(!sameAccountRetryButton){
    sameAccountRetryButton=document.createElement('button');
    sameAccountRetryButton.id='climboria-room-retry-same-account';
    sameAccountRetryButton.type='button';
    sameAccountRetryButton.textContent='RETRY ROOM CONNECTION';
    sameAccountRetryButton.style.cssText='display:block;width:100%;margin-top:8px;padding:9px 11px;border:1px solid #d8b46b;border-radius:8px;background:#253448;color:#ffe3a3;font:800 11px/1.35 system-ui;cursor:pointer;pointer-events:auto;touch-action:manipulation';
    sameAccountRetryButton.addEventListener('click',event=>{
     event?.stopPropagation?.();
     if(doc.dataset.climboriaMultiplayer!=='same-account-in-use')return;
     sameAccountInUse=false;
     showStatus('checking','MULTIPLAYER · RECHECKING ROOM');
     scheduleConnect(0);
    });
   }
   badge.appendChild(sameAccountRetryButton);
  }
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
   if(spawnConfirmed||!validId(msg.selfId)||!Array.isArray(msg.peers)||msg.peers.length>32)return;
   clearPeers();selfId=msg.selfId;
   // A ticket and provisional welcome roster do NOT prove our terrain spawn.
   // Never allocate remote 3D models or show players from this roster.
   // The later spawn-accepted packet contains the authoritative CURRENT peers.
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
    // Only a verified server spawn-accepted completes room admission.
    clearAdmissionTimer();
    ensureDuelUi();ensureWorldChatUi();
    showStatus('connected','ONLINE · '+known.size+' other explorers');
   }
  }else if(msg.type==='player-joined'){
   if(spawnConfirmed)addPlayer(msg.player);
  }else if(msg.type==='player-moved'){
   if(spawnConfirmed&&validId(msg.id)&&known.has(msg.id)&&validPosition(msg.position)){
    known.get(msg.id).position={x:msg.position.x,y:msg.position.y,z:msg.position.z};
    renderer.move(msg.id,msg.position);
   }
  }else if(msg.type==='player-left'){if(spawnConfirmed)leave(msg.id)}
  else if(msg.type==='world-chat'){if(spawnConfirmed)appendWorldChat(msg)}
  else if(msg.type==='rejected'&&msg.reason==='invalid-initial-spawn'){
   // A rejected first spawn leaves the socket open on the Game Worker.
   // Close it and retry admission when the real hero returns to Sanctuary.
   const rejected=socket;
   clearAdmissionTimer();
   socket=null;previous=null;
   if(movement){clearInterval(movement);movement=null}
   clearPeers();
   if(rejected){try{rejected.close()}catch{}}
   showStatus('spawn-rejected','MULTIPLAYER · RETURN TO SANCTUARY · PRESS 1');
   scheduleConnect(1200);
  }
  else if(msg.type==='rejected'&&['world-chat-rate-limit','world-chat-invalid-text'].includes(msg.reason)){
   // Only the server rejection for THIS request can release its pending
   // state. A late error for an earlier retry cannot cancel a newer send.
   if(pendingWorldChat && msg.chatSeq===pendingWorldChat.chatSeq){
    clearPendingWorldChat();
    if(chatUi)chatUi.notice.textContent=msg.reason==='world-chat-rate-limit'?
     'Please wait a moment before chatting again. Your message is still editable.':
     'Message not accepted. Use 1–160 readable characters. Your text is still editable.';
   }
  }
  else if(msg.type==='player-punched'&&spawnConfirmed&&validId(msg.id)&&known.has(msg.id))renderer.punch(msg.id);
  else if(spawnConfirmed&&typeof msg.type==='string'&&msg.type.startsWith('duel-'))onDuelPacket(msg);
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
 // Server accepts initial room admission only within 6m of Sanctuary.
 // Never fake a remote spawn or send an impossible ticket request.
 function isAtRoomSpawn(){
  const p=localPosition();
  return validPosition(p)&&Math.hypot(p.x,p.z+30)<=6&&p.y>=0&&p.y<=45;
 }
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
  if(disposed||socket||sameAccountInUse)return;
  if(reconnect)clearTimeout(reconnect);
  reconnect=setTimeout(()=>{reconnect=null;void connect()},delay);
 }
 function clearAdmissionTimer(){
  if(admissionTimer!==null){clearTimeout(admissionTimer);admissionTimer=null}
 }
 function armAdmissionTimer(ws,epoch){
  clearAdmissionTimer();
  // The browser WebSocket constructor can succeed yet never open, and a
  // healthy open can still wait forever for a server-verified spawn.
  // Independently bound both stages; never treat open/welcome as ONLINE.
  admissionTimer=setTimeout(()=>{
   admissionTimer=null;
   if(disposed||socket!==ws||epoch!==connectEpoch||spawnConfirmed)return;
   socket=null;previous=null;
   if(movement){clearInterval(movement);movement=null}
   clearPeers();
   try{ws.close()}catch{}
   showStatus('offline','MULTIPLAYER · RECONNECTING');
   scheduleConnect(5000);
  },12000);
 }
 function resetConnection(){
  clearAdmissionTimer();
  sameAccountInUse=false;
  // Invalidate pending getSession/ticket responses so a signed-out account
  // cannot later create a socket or revive its World Chat after logout.
  connectEpoch++;
  connecting=false;
  // Cancel any unresolved identity lookup on logout/account change, so no
  // old session can keep the client waiting or outlive the current epoch.
  if(sessionLookupCancel){
   const cancel=sessionLookupCancel;sessionLookupCancel=null;cancel();
  }
  if(reconnect){clearTimeout(reconnect);reconnect=null}
  if(movement){clearInterval(movement);movement=null}
  const old=socket;socket=null;previous=null;
  if(old){try{old.close()}catch{}}
  clearPeers();
 }
 // A local waypoint teleport cannot be sent as an ordinary position
 // update: the room correctly rejects implausibly fast movement. Clear the
 // old visible peer/chat session and use fresh authenticated Sanctuary
 // admission, not a client-authorized server teleport or fake position.
 document.addEventListener('climboria:local-teleport',()=>{
  if(disposed||(!socket&&!connecting))return;
  resetConnection();
  showStatus('rejoining','MULTIPLAYER · REJOINING AFTER TELEPORT');
  scheduleConnect(0);
 });
 async function connect(){
  if(disposed||connecting||socket||sameAccountInUse)return;
  if(!isReady()){scheduleConnect(1200);return}
  connecting=true;
  const epoch=++connectEpoch;
  showStatus('session-check','MULTIPLAYER · CHECKING GAME LOGIN');
  try{
   // A wedged Supabase getSession must not strand the Game on CONNECTING.
   // Its public API has no AbortSignal; race an independent wall-clock
   // deadline, and cancel the wait on sign-out or account switching.
   let sessionTimer,cancelSessionWait;
   const sessionDeadline=new Promise((_,reject)=>{
    // Clear synchronously on account change: do not leave the stale 8s
    // timer runnable until Promise.race's next microtask/finally callback.
    cancelSessionWait=()=>{clearTimeout(sessionTimer);reject(Error('Game session lookup superseded'))};
    sessionTimer=setTimeout(()=>reject(Error('Game session lookup timed out')),8000);
   });
   sessionLookupCancel=cancelSessionWait;
   let sessionResult;
   try{
    sessionResult=await Promise.race([
     Promise.resolve().then(()=>auth.auth.getSession()),sessionDeadline
    ]);
   }finally{
    clearTimeout(sessionTimer);
    if(sessionLookupCancel===cancelSessionWait)sessionLookupCancel=null;
   }
   const {data,error}=sessionResult;
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
   // A real signed-in explorer who is already away from the protected spawn
   // must return to Sanctuary before this server can safely admit a new room
   // session. Avoid consuming short-lived tickets for known-invalid spawns.
   if(!isAtRoomSpawn()){
    showStatus('awaiting-sanctuary','MULTIPLAYER · RETURN TO SANCTUARY · PRESS 1');
    scheduleConnect(1200);
    return;
   }
   const hero=window.__climboriaCreatedHero||{};
   showStatus('ticket-request','MULTIPLAYER · VERIFYING ROOM ACCESS');
   const ticketAbort=new AbortController();
   let ticketDeadline;
   let issued;
   try{
    // Bound the entire signed-in ticket stage (fetch AND response JSON), even
    // if a stalled Worker or body reader ignores AbortSignal. A timed-out
    // request must never manufacture a peer, open a stale socket, or leave
    // the Game UI stuck on CONNECTING.
    const requestTicket=async token=>{
     const reply=await fetch(new URL('ticket',base),{
      method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
      signal:ticketAbort.signal,
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({name:hero.name,model:hero.model})
     });
     if(reply.status===429)return {busy:true};
     if(reply.status===401)return {loginRequired:true};
     if(reply.status===403)return {originDenied:true};
     if(!reply.ok)throw Error('Room ticket denied');
     return {ticket:await reply.json()};
    };
    const work=(async()=>{
     let outcome=await requestTicket(session.access_token);
     // The site's own Supabase client may have an expired access token
     // even though the registered account still has a valid refresh token.
     // Allow exactly ONE refresh of the same account and one fresh ticket
     // request. Never switch identity, bypass Worker verification or loop.
     if(outcome.loginRequired&&typeof auth.auth.refreshSession==='function'&&
        !disposed&&epoch===connectEpoch){
      try{
       const result=await auth.auth.refreshSession();
       const next=result?.data?.session;
       if(!result?.error&&next?.user?.id===session.user.id&&
          next.user.is_anonymous!==true&&
          next.user.app_metadata?.provider!=='anonymous'&&
          typeof next.access_token==='string'&&
          next.access_token!==session.access_token&&
          next.access_token.length>0&&!disposed&&epoch===connectEpoch){
        outcome=await requestTicket(next.access_token);
       }
      }catch{
       // Refresh errors are normal for revoked sessions. Keep the original
       // login-required state; never expose tokens or provider error text.
      }
     }
     return outcome;
    })();
    const deadline=new Promise((_,reject)=>{
     ticketDeadline=setTimeout(()=>{
      ticketAbort.abort();
      reject(Error('Room ticket deadline expired'));
     },18000);
    });
    issued=await Promise.race([work,deadline]);
   }finally{clearTimeout(ticketDeadline)}
   if(disposed||epoch!==connectEpoch)return;
   if(issued.busy){
    // An authenticated room can be temporarily full or this account may
    // already have two outstanding tickets. Do not claim the server is down.
    showStatus('room-busy','MULTIPLAYER · ROOM BUSY · RETRYING');
    scheduleConnect(10000);
    return;
   }
   if(issued.loginRequired){
    // A stored but expired/revoked session is not a successful room login.
    // Do not open sockets or pretend that a player joined.
    showStatus('login-required','MULTIPLAYER · SIGN IN AGAIN TO JOIN');
    scheduleConnect(10000);
    return;
   }
   if(issued.originDenied){
    showStatus('offline','MULTIPLAYER · ROOM ACCESS DENIED');
    scheduleConnect(10000);
    return;
   }
   const ticket=issued.ticket;
   if(!/^[a-f0-9]{64}$/.test(ticket?.ticket||'')||
      ticket.protocol!=='climboria-v1'||ticket.ttlSeconds!==30)
    throw Error('Invalid room ticket');
   const socketURL=new URL('ws',base);socketURL.protocol='wss:';
   const ws=new WebSocket(socketURL.toString(),['climboria-v1','t-'+ticket.ticket]);
   socket=ws;
   showStatus('socket-connecting','MULTIPLAYER · CONNECTING TO WORLD');
   armAdmissionTimer(ws,epoch); // WebSocket CONNECTING cannot stall forever.
   ws.onmessage=e=>{if(!disposed&&socket===ws&&epoch===connectEpoch)onPacket(e.data)};
   ws.onopen=()=>{
    if(disposed||socket!==ws||epoch!==connectEpoch||!isReady()){ws.close();return}
    // The player may move after the room ticket is issued. Never submit an
    // untrusted or out-of-Sanctuary first position merely to obtain a peer.
    if(!isAtRoomSpawn()){
     clearAdmissionTimer();socket=null;previous=null;
     try{ws.close()}catch{}
     showStatus('awaiting-sanctuary','MULTIPLAYER · RETURN TO SANCTUARY · PRESS 1');
     scheduleConnect(1200);
     return;
    }
    previous=null;
    showStatus('spawn-pending','MULTIPLAYER · VERIFYING SANCTUARY SPAWN');
    armAdmissionTimer(ws,epoch); // OPEN is not an accepted terrain spawn.
    send({type:'spawn',position:localPosition()});
    if(movement)clearInterval(movement);
    movement=setInterval(publishMovement,250);
   };
   ws.onclose=event=>{
    if(socket!==ws||disposed||epoch!==connectEpoch)return;
    clearAdmissionTimer();
    socket=null;clearPeers();previous=null;
    if(movement){clearInterval(movement);movement=null}
    if(event?.code===4001){
     // The Game Worker explicitly replaced this socket because another tab
     // authenticated as the same Supabase UUID. Different login methods
     // might still be linked to ONE account; do not make up a second peer.
     // Stop automatic retry so the two tabs do not continually evict each
     // other. The user may switch identities or explicitly retry after
     // closing the other tab.
     sameAccountInUse=true;
     if(reconnect){clearTimeout(reconnect);reconnect=null}
     showStatus('same-account-in-use','MULTIPLAYER · SAME ACCOUNT IN ANOTHER TAB · USE TWO DIFFERENT ACCOUNTS');
     return;
    }
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
