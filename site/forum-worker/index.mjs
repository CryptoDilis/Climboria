import { verifyMessage } from 'ethers';

const CHAIN=8453, CHALLENGE_MS=5*60_000, SESSION_MS=60*60_000;
const CATEGORIES=new Set(['general','governance','launchpad','game','treasury','feedback']);
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const TOKEN=/^[0-9a-f]{64}$/;
const NONCE=/^[0-9a-f]{48}$/;
const SIGNATURE=/^0x[0-9a-fA-F]{130}$/;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const random=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const hash=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
class Problem extends Error{constructor(status,code){super(code);this.status=status;this.code=code;}}
const reject=(status,code)=>{throw new Problem(status,code);};
function textField(v,max){if(typeof v!=='string')reject(400,'invalid_text');const s=v.trim();if(!s||s.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s))reject(400,'invalid_text');return s;}
function wallet(v){if(typeof v!=='string'||!ADDRESS.test(v)||/^0x0{40}$/i.test(v))reject(400,'invalid_wallet');return v.toLowerCase();}
function id(v){if(typeof v!=='string'||!/^[1-9][0-9]{0,14}$/.test(v)||!Number.isSafeInteger(Number(v)))reject(400,'invalid_id');return Number(v);}
async function body(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))reject(415,'json_required');
 const reader=req.body?.getReader();if(!reader)reject(400,'invalid_json');
 const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24000){await reader.cancel();reject(413,'body_too_large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 let v;try{v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{reject(400,'invalid_json');}
 if(!v||typeof v!=='object'||Array.isArray(v))reject(400,'invalid_json');return v;
}
function challengeMessage(origin,address,nonce,now){
 const u=new URL(origin);
 return u.host+' wants you to sign in with your Ethereum account:\n'+address+'\n\nSign in to Climboria Governance Forum. No transaction or token approval.\n\nURI: '+origin+'/governance/\nVersion: 1\nChain ID: '+CHAIN+'\nNonce: '+nonce+'\nIssued At: '+new Date(now).toISOString()+'\nExpiration Time: '+new Date(now+CHALLENGE_MS).toISOString();
}
async function rate(db,bucket,now,cap,ms=60_000){
 const row=await db.prepare('INSERT INTO limits(bucket,window,count) VALUES(?,?,1) ON CONFLICT(bucket,window) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count').bind(bucket,Math.floor(now/ms)*ms,cap).first();
 if(!row)reject(429,'rate_limited');
}
async function session(req,db,now){
 const m=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get('authorization')||'');
 if(!m||!TOKEN.test(m[1]))reject(401,'wallet_session_required');
 const digest=await hash(m[1]);
 const s=await db.prepare('SELECT wallet FROM sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?').bind(digest,now).first();
 if(!s)reject(401,'wallet_session_required');
 return {wallet:s.wallet,digest};
}
const json=(payload,status,origin)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','vary':'Origin',...(origin?{'access-control-allow-origin':origin}:{} )}});
const sessionCheck='EXISTS(SELECT 1 FROM sessions WHERE token_hash=? AND wallet=? AND revoked_at IS NULL AND expires_at>?)';
export default {
 async fetch(req,env){
  const origin=env.FORUM_ORIGIN==='https://climboria.fun'?env.FORUM_ORIGIN:null;
  const requestOrigin=req.headers.get('origin');
  const cors=origin&&requestOrigin===origin?origin:null;
  const send=(v,status=200)=>json(v,status,cors);
  try{
   if(!origin)reject(503,'forum_unavailable');
   if(requestOrigin&&!cors)reject(403,'origin_denied');
   if(req.method==='OPTIONS'){
    if(!cors)reject(403,'origin_denied');
    return new Response(null,{status:204,headers:{'access-control-allow-origin':cors,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Authorization, Content-Type','access-control-max-age':'600','vary':'Origin','cache-control':'no-store'}});
   }
   const u=new URL(req.url),p=u.pathname;
   if(req.method==='GET'&&p==='/v1/health')return send({enabled:env.FORUM_ENABLED==='true',chainId:CHAIN,governanceVoting:false});
   if(env.FORUM_ENABLED!=='true'||!env.DB)reject(503,'forum_unavailable');
   const db=env.DB,now=Date.now();
   if(req.method==='POST'&&!cors)reject(403,'origin_required');
   if(req.method==='POST'&&p==='/v1/challenge'){
    const ip=await hash(req.headers.get('CF-Connecting-IP')||'unknown');
    await rate(db,'challenge:'+ip,now,10);
    const v=await body(req),a=wallet(v.address);
    if(v.chainId!==CHAIN)reject(400,'wrong_chain');
    const nonce=random(24),message=challengeMessage(origin,a,nonce,now);
    await db.prepare('INSERT INTO challenges(nonce,wallet,message,expires_at) VALUES(?,?,?,?)').bind(nonce,a,message,now+CHALLENGE_MS).run();
    return send({nonce,message,expiresAt:now+CHALLENGE_MS});
   }
   if(req.method==='POST'&&p==='/v1/verify'){
    const ip=await hash(req.headers.get('CF-Connecting-IP')||'unknown');await rate(db,'verify:'+ip,now,15);
    const v=await body(req);
    if(typeof v.nonce!=='string'||!NONCE.test(v.nonce)||typeof v.signature!=='string'||!SIGNATURE.test(v.signature))reject(400,'invalid_proof');
    const c=await db.prepare('SELECT wallet,message FROM challenges WHERE nonce=? AND used_at IS NULL AND expires_at>?').bind(v.nonce,now).first();
    if(!c)reject(401,'challenge_invalid');
    let signer;try{signer=verifyMessage(c.message,v.signature).toLowerCase();}catch{reject(401,'signature_invalid');}
    if(signer!==c.wallet)reject(401,'signature_invalid');
    const used=await db.prepare('UPDATE challenges SET used_at=? WHERE nonce=? AND used_at IS NULL AND expires_at>? RETURNING nonce').bind(Date.now(),v.nonce,Date.now()).first();
    if(!used)reject(401,'challenge_invalid');
    const token=random(32),expiresAt=Date.now()+SESSION_MS;
    await db.prepare('INSERT INTO sessions(token_hash,wallet,expires_at) VALUES(?,?,?)').bind(await hash(token),c.wallet,expiresAt).run();
    return send({token,wallet:c.wallet,expiresAt,chainId:CHAIN});
   }
   if(req.method==='POST'&&p==='/v1/logout'){
    const s=await session(req,db,now);
    await db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').bind(Date.now(),s.digest).run();
    return send({signedOut:true});
   }
   if(req.method==='GET'&&p==='/v1/topics'){
    const before=u.searchParams.has('before')?id(u.searchParams.get('before')):Number.MAX_SAFE_INTEGER;
    const category=u.searchParams.get('category');
    if(category!==null&&!CATEGORIES.has(category))reject(400,'invalid_category');
    const result=await db.prepare('SELECT id,wallet,category,title,body,created_at FROM topics WHERE hidden=0 AND id<? AND (? IS NULL OR category=?) ORDER BY id DESC LIMIT 21').bind(before,category,category).all();
    const rows=result.results;return send({topics:rows.slice(0,20),nextBefore:rows.length>20?String(rows[19].id):null});
   }
   if(req.method==='POST'&&p==='/v1/topics'){
    const s=await session(req,db,now),v=await body(req);
    if(!CATEGORIES.has(v.category))reject(400,'invalid_category');
    const title=textField(v.title,120),content=textField(v.body,8000);
    await rate(db,'topic:'+s.wallet,now,3);
    const at=Date.now();
    const row=await db.prepare('INSERT INTO topics(wallet,category,title,body,created_at) SELECT ?,?,?,?,? WHERE '+sessionCheck+' RETURNING id').bind(s.wallet,v.category,title,content,at,s.digest,s.wallet,at).first();
    if(!row)reject(401,'wallet_session_required');return send({id:row.id},201);
   }
   const match=/^\/v1\/topics\/([1-9][0-9]{0,14})\/(replies|reports)$/.exec(p);
   if(match){
    const topic=id(match[1]);
    if(req.method==='GET'&&match[2]==='replies'){
     if(!await db.prepare('SELECT id FROM topics WHERE id=? AND hidden=0').bind(topic).first())reject(404,'topic_not_found');
     const after=u.searchParams.has('after')?id(u.searchParams.get('after')):0;
     const result=await db.prepare('SELECT r.id,r.wallet,r.body,r.created_at FROM replies r JOIN topics t ON t.id=r.topic_id WHERE t.hidden=0 AND r.hidden=0 AND r.topic_id=? AND r.id>? ORDER BY r.id LIMIT 51').bind(topic,after).all();
     const rows=result.results;return send({replies:rows.slice(0,50),nextAfter:rows.length>50?String(rows[49].id):null});
    }
    if(req.method==='POST'){
     const s=await session(req,db,now),v=await body(req),report=match[2]==='reports';
     const content=textField(report?v.reason:v.body,report?500:8000);
     await rate(db,(report?'report:':'reply:')+s.wallet,now,report?5:10);
     const at=Date.now();
     const statement=report?'INSERT OR IGNORE INTO reports(topic_id,wallet,reason,created_at)':'INSERT INTO replies(topic_id,wallet,body,created_at)';
     const row=await db.prepare(statement+' SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM topics WHERE id=? AND hidden=0) AND '+sessionCheck+' RETURNING id').bind(topic,s.wallet,content,at,topic,s.digest,s.wallet,at).first();
     if(!row)reject(409,'write_not_available');return send({id:row.id},201);
    }
   }
   // Proposals, votes, reactions, edits and moderation remain unavailable. A
   // normal discussion topic is never a formal proposal or treasury command.
   if(req.method==='POST'&&/^\/v1\/(proposals|votes|reactions|moderation)(\/|$)/.test(p)){
    await session(req,db,now);reject(503,'feature_not_enabled');
   }
   reject(404,'not_found');
  }catch(e){return e instanceof Problem?send({error:e.code},e.status):send({error:'forum_unavailable'},503);}
 },
 async scheduled(_controller,env){
  if(env.FORUM_ENABLED!=='true'||!env.DB)return;
  const now=Date.now();await env.DB.batch([
   env.DB.prepare('DELETE FROM challenges WHERE expires_at<?').bind(now-60_000),
   env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now-60_000),
   env.DB.prepare('DELETE FROM limits WHERE window<?').bind(now-86400000)
  ]);
 }
};
