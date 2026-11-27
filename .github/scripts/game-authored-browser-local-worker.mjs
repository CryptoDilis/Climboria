// CI-only entry. Never deploy; no production authentication or route.
// Only the WebSocket upgrade is exposed to the local Chromium process.
// Ticket issuance and deterministic ticks remain private DO test calls.
export {AuthoredLocalRoom} from './game-authored-local-worker.mjs';
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(env.AUTHORED_BROWSER_CI!=='true'||u.hostname!=='127.0.0.1'||
    u.pathname!=='/ws'||req.method!=='GET'||
    req.headers.get('Origin')!=='http://127.0.0.1:4173'||
    req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response(null,{status:404});
 const protocols=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
 if(protocols.length!==2||protocols[0]!=='climboria-preview-v1'||!/^t-[a-f0-9]{64}$/.test(protocols[1]))
  return new Response(null,{status:401});
 const headers=new Headers(req.headers);
 headers.set('Sec-WebSocket-Protocol',protocols.join(','));
 const stub=env.ROOM.get(env.ROOM.idFromName('preview-jarrell-camp-v1'));
 return stub.fetch(new Request('https://local.internal/ws',{headers}));
}};
