// Production activation requires a reviewed source change AND a healthy deployed Worker.
const API='https://forum.climboria.fun';
const ORIGIN='https://climboria.fun';
const CHAIN='0x2105';
const $=id=>document.getElementById(id);
const walletButton=$('forum-wallet'), logout=$('forum-logout'), create=$('new-topic'), form=$('topic-form');
let enabled=false, auth=null, provider=null, generation=0, busy=false, feedVersion=0, cursor=null, modCursor=null, modVersion=0;
const addressPattern=/^0x[0-9a-fA-F]{40}$/;
const categories={general:'General discussion',governance:'Governance ideas',launchpad:'Signature Launchpad',game:'Game & ecosystem',treasury:'Treasury & transparency',feedback:'Feedback & support'};
const status=s=>{$('forum-status').textContent=s;};
function validAuth(){return !!auth&&auth.expiresAt>Date.now();}
function renderAuth(){
 const signed=validAuth();walletButton.hidden=signed;walletButton.disabled=!enabled||busy;
 logout.hidden=!signed;create.disabled=!enabled||!signed||busy;
 $('moderator-panel').hidden=!signed;
 if(!signed){form.hidden=true;resetModeration();}
 for(const e of document.querySelectorAll('[data-wallet-action]'))e.disabled=!signed||busy;
 $('posting-note').textContent=!enabled?'Posting and replies are not open yet.':signed?'Your wallet address is public on posts.':'Sign in with a Base wallet to participate.';
}
async function api(path,{method='GET',data,token}={}){
 const headers={};if(data!==undefined)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(API+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 const result=await response.json();if(!response.ok){const e=new Error('Request rejected');e.code=result.error;e.status=response.status;throw e;}return result;
}
function revoke(token){if(token)void api('/v1/logout',{method:'POST',data:{},token}).catch(()=>{});}
function detach(){if(provider?.removeListener){provider.removeListener('accountsChanged',walletChanged);provider.removeListener('chainChanged',walletChanged);provider.removeListener('disconnect',walletChanged);}provider=null;}
function clear(message){const token=auth?.token;generation++;auth=null;busy=false;detach();renderAuth();status(message);revoke(token);}
function walletChanged(){clear('Wallet changed. Sign in again.');}
async function identity(p,ask=false){
 const chain=await p.request({method:'eth_chainId'});if(chain!==CHAIN)throw Error('Switch your wallet to Base mainnet first.');
 const accounts=await p.request({method:ask?'eth_requestAccounts':'eth_accounts'});
 if(!Array.isArray(accounts)||!addressPattern.test(accounts[0]||''))throw Error('No valid wallet account.');
 return accounts[0].toLowerCase();
}
function verifyChallenge(c,a){
 if(!c||!/^[0-9a-f]{48}$/.test(c.nonce)||typeof c.message!=='string'||!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=Date.now()||c.expiresAt>Date.now()+310000)throw Error('Invalid login challenge.');
 const m=c.message.split('\n');
 if(m.length!==11||m[0]!=='climboria.fun wants you to sign in with your Ethereum account:'||m[1].toLowerCase()!==a||m[2]!==''||m[3]!=='Sign in to Climboria Governance Forum. No transaction or token approval.'||m[4]!==''||m[5]!=='URI: '+ORIGIN+'/governance/'||m[6]!=='Version: 1'||m[7]!=='Chain ID: 8453'||m[8]!=='Nonce: '+c.nonce||!m[9].startsWith('Issued At: ')||!m[10].startsWith('Expiration Time: ')||Date.parse(m[10].slice(17))!==c.expiresAt||Date.parse(m[9].slice(11))!==c.expiresAt-300000)throw Error('Unexpected signature request.');
}
walletButton.addEventListener('click',async()=>{
 if(!enabled||busy)return;
 const p=window.ethereum;if(!p||typeof p.request!=='function'||typeof p.on!=='function'||typeof p.removeListener!=='function'){status('Open this page in a compatible EVM wallet browser.');return;}
 busy=true;const attempt=++generation;provider=p;renderAuth();
 let issued=null;
 try{
  const a=await identity(p,true);if(attempt!==generation)return;
  for(const event of ['accountsChanged','chainChanged','disconnect'])p.on(event,walletChanged);
  const c=await api('/v1/challenge',{method:'POST',data:{address:a,chainId:8453}});verifyChallenge(c,a);
  if(attempt!==generation||await identity(p)!==a||attempt!==generation)return;
  const bytes=new TextEncoder().encode(c.message);const hex='0x'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  const signature=await p.request({method:'personal_sign',params:[hex,a]});
  if(attempt!==generation||await identity(p)!==a||attempt!==generation)return;
  issued=await api('/v1/verify',{method:'POST',data:{nonce:c.nonce,signature}});
  if(attempt!==generation||await identity(p)!==a||attempt!==generation)return;
  if(issued.wallet!==a||issued.chainId!==8453||!/^[0-9a-f]{64}$/.test(issued.token)||!Number.isSafeInteger(issued.expiresAt)||issued.expiresAt<=Date.now()||issued.expiresAt>Date.now()+3610000)throw Error('Invalid wallet session.');
  auth=issued;issued=null;status('Signed in with '+a);
  setTimeout(()=>{if(generation===attempt&&auth&&!validAuth())clear('Session expired. Sign in again.');},Math.max(0,auth.expiresAt-Date.now()+50));
 }catch(e){if(attempt===generation){detach();status(e?.code===4001?'Signature declined.':e.message==='Switch your wallet to Base mainnet first.'?e.message:'Wallet sign-in failed. Try again.');}}
 finally{if(issued&&/^[0-9a-f]{64}$/.test(issued.token))revoke(issued.token);if(attempt===generation){busy=false;if(!auth)detach();renderAuth();}}
});
logout.addEventListener('click',()=>clear('Signed out.'));
async function mutate(path,data){
 if(busy||!validAuth()||!provider)throw Error('Wallet sign-in required.');
 const current=auth,attempt=generation;busy=true;renderAuth();
 try{
  if(await identity(provider)!==current.wallet||attempt!==generation){if(attempt===generation)clear('Wallet changed. Sign in again.');throw Error('Wallet changed.');}
  const result=await api(path,{method:'POST',data,token:current.token});
  if(attempt!==generation)throw Error('Wallet changed during request.');
  return result;
 }catch(e){if(e.status===401&&attempt===generation)clear('Session expired. Sign in again.');throw e;}
 finally{if(attempt===generation){busy=false;renderAuth();}}
}
function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;}
function action(text,fn,protectedAction=false){const b=node('button',text);b.type='button';if(protectedAction){b.dataset.walletAction='';b.disabled=!validAuth()||busy;}b.addEventListener('click',async()=>{try{await fn();}catch{status('Action unavailable or rejected. No success confirmed.');}});return b;}
function validId(v){return Number.isSafeInteger(v)&&v>0;}
function record(row){return validId(row.id)&&addressPattern.test(row.wallet)&&typeof row.body==='string'&&Number.isSafeInteger(row.created_at);}
function author(row){return node('small',row.wallet+' · '+new Date(row.created_at).toISOString());}
function topicCard(t){
 const article=node('article');article.className='topic';article.append(node('small','Topic #'+t.id+' · '+(categories[t.category]||'Discussion')),node('h3',t.title),author(t),node('p',t.body));
 const controls=node('div');controls.className='topic-actions';const replies=node('div');replies.className='replies';replies.hidden=true;
 let after=null,replyVersion=0;
 const replyList=node('div'),more=action('More replies',()=>loadReplies(true));more.hidden=true;
 async function loadReplies(append=false){const version=++replyVersion;const data=await api('/v1/topics/'+t.id+'/replies'+(append&&after?'?after='+encodeURIComponent(after):''));if(version!==replyVersion)return;if(!append)replyList.replaceChildren();for(const row of data.replies){if(!record(row))continue;const item=node('article');item.append(node('small','Reply #'+row.id),author(row),node('p',row.body));replyList.append(item);}after=data.nextAfter;more.hidden=!after;replies.hidden=false;}
 controls.append(action('Read replies',()=>loadReplies()),node('span','Likes: '+(Number.isSafeInteger(t.likes)?t.likes:'Unavailable')),action('Like',async()=>{await mutate('/v1/reactions',{topicId:t.id,action:'like'});await loadTopics();},true),action('Unlike',async()=>{await mutate('/v1/reactions',{topicId:t.id,action:'unlike'});await loadTopics();},true));
 const reply=node('textarea');reply.maxLength=8000;reply.rows=3;reply.setAttribute('aria-label','Write a reply');reply.dataset.walletAction='';const report=node('textarea');report.maxLength=500;report.rows=2;report.setAttribute('aria-label','Report reason');report.dataset.walletAction='';
 replies.append(replyList,more,reply,action('Post reply',async()=>{await mutate('/v1/topics/'+t.id+'/replies',{body:reply.value});reply.value='';await loadReplies();},true),report,action('Report topic',async()=>{await mutate('/v1/topics/'+t.id+'/reports',{reason:report.value});report.value='';status('Report received.');},true));
 article.append(controls,replies);return article;
}
async function loadTopics(append=false){
 const version=++feedVersion;const params=new URLSearchParams();const cat=$('category-filter').value;if(cat)params.set('category',cat);if(append&&cursor)params.set('before',cursor);
 const data=await api('/v1/topics?'+params);if(version!==feedVersion)return;
 const list=$('topic-list');if(!append)list.replaceChildren();for(const t of data.topics){if(record(t)&&typeof t.title==='string')list.append(topicCard(t));}
 if(!list.childElementCount)list.append(node('p','No published topics.'));
 cursor=data.nextBefore;$('more-topics').hidden=!cursor;renderAuth();
}
$('category-filter').addEventListener('change',()=>loadTopics().catch(()=>status('Unable to load topics.')));
$('more-topics').addEventListener('click',()=>loadTopics(true).catch(()=>status('Unable to load more topics.')));
create.addEventListener('click',()=>{if(validAuth())form.hidden=!form.hidden;});
form.addEventListener('submit',async e=>{e.preventDefault();try{await mutate('/v1/topics',{category:$('topic-category').value,title:$('topic-title').value,body:$('topic-body').value});form.reset();form.hidden=true;status('Topic published.');await loadTopics();}catch{status('Topic not confirmed. Check the forum before retrying.');}});
async function start(){
 try{
  const config=await fetch('/governance/forum-release.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error();return r.json();});
  if(config.enabled!==true)return;
  const health=await api('/v1/health');if(health.enabled!==true||health.chainId!==8453||health.governanceVoting!==false)return;
  await loadTopics();enabled=true;$('forum-feed').hidden=false;$('board-status').textContent='DISCUSSIONS';for(const e of document.querySelectorAll('.board small'))e.textContent='Browse below';status('Connect and sign with a Base wallet.');renderAuth();
 }catch{status('Forum backend unavailable.');renderAuth();}
}
function resetModeration(){
 modVersion++;modCursor=null;$('moderator-queue').hidden=true;$('moderator-reports').replaceChildren();$('moderator-more').hidden=true;$('moderator-form').reset();
}
async function loadModeration(append=false){
 if(!validAuth()||!provider)return;
 const attempt=generation,version=++modVersion,current=auth;
 try{
  if(await identity(provider)!==current.wallet||attempt!==generation){if(attempt===generation)clear('Wallet changed. Sign in again.');return;}
  const data=await api('/v1/moderation/reports'+(append&&modCursor?'?before='+encodeURIComponent(modCursor):''),{token:current.token});
  if(attempt!==generation||version!==modVersion||!validAuth())return;
  const list=$('moderator-reports');if(!append)list.replaceChildren();
  for(const row of data.reports){
   if(!validId(row.id)||!validId(row.topic_id))continue;
   const card=node('article');card.className='mod-report';
   card.append(node('h3','Report #'+row.id+' · Topic #'+row.topic_id),node('small',row.topic_hidden===1?'Hidden':'Visible'),node('p',row.topic_title),node('p',row.topic_body),node('small','Reported by '+row.wallet),node('p',row.reason));
   card.append(action('Select topic',()=>{$('mod-target-type').value='topic';$('mod-target-id').value=String(row.topic_id);$('mod-action').value=row.topic_hidden===1?'restore':'hide';$('mod-reason').focus();}));
   list.append(card);
  }
  if(!list.childElementCount)list.append(node('p','No reports.'));
  modCursor=data.nextBefore;$('moderator-more').hidden=!modCursor;$('moderator-queue').hidden=false;
 }catch(e){if(attempt!==generation||version!==modVersion)return;resetModeration();if(e.status===401)clear('Session expired. Sign in again.');else status(e.status===403?'Moderator role required.':'Moderation queue unavailable.');}
}
$('moderator-open').addEventListener('click',()=>loadModeration());
$('moderator-more').addEventListener('click',()=>loadModeration(true));
$('moderator-form').addEventListener('submit',async e=>{
 e.preventDefault();
 try{
  await mutate('/v1/moderation/actions',{targetType:$('mod-target-type').value,targetId:$('mod-target-id').value,action:$('mod-action').value,reason:$('mod-reason').value});
  $('moderator-form').reset();status('Moderation recorded.');await loadModeration();await loadTopics();
 }catch(e){if(e.status===403)resetModeration();status('Moderation not confirmed. Refresh before retrying.');}
});
renderAuth();void start();
