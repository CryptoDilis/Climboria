/** Local-only standard Supabase Google OAuth authorization code + PKCE.
 * Google sign-in is performed in an ordinary user browser, not Playwright.
 * No refresh token persisted, no credential-bearing callback URLs logged.
 */
import {randomBytes,createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
const AUTH='https://unadepiwbovblkfjlksk.supabase.co/auth/v1';
// Same public browser key as game/index.html; never service-role.
const KEY='sb_publishable_5DTna9vCafWt4YEbkSSaAA_W0hEDiUK';
export const CALLBACK='http://127.0.0.1:8765/game-qa/callback';
const CODE=/^[A-Za-z0-9._~-]{1,512}$/;
export function createGoogleAttempt(verifier=randomBytes(32).toString('base64url')){
 if(typeof verifier!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier))throw Error('invalid-pkce-verifier');
 const url=new URL(AUTH+'/authorize');
 for(const [k,v] of Object.entries({provider:'google',redirect_to:CALLBACK,
  code_challenge:createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method:'s256',prompt:'select_account'}))url.searchParams.set(k,v);
 return {url:url.href,verifier};
}
export function callbackCode(req){
 if(req.method!=='GET'||req.headers?.host!=='127.0.0.1:8765'||typeof req.url!=='string'||!req.url.startsWith('/game-qa/callback?'))return null;
 try{
  const u=new URL(req.url,CALLBACK);
  const codes=u.searchParams.getAll('code');
  return u.origin===new URL(CALLBACK).origin&&u.pathname==='/game-qa/callback'&&
    !u.searchParams.has('error')&&codes.length===1&&CODE.test(codes[0])?codes[0]:null;
 }catch{return null}
}
export async function exchangeGoogleCode(code,verifier,fetcher=fetch){
 if(!CODE.test(code||''))throw Error('invalid-oauth-code');
 const r=await fetcher(AUTH+'/token?grant_type=pkce',{method:'POST',redirect:'error',
  headers:{apikey:KEY,'content-type':'application/json'},signal:AbortSignal.timeout(15000),
  body:JSON.stringify({auth_code:code,code_verifier:verifier})});
 if(!r.ok)throw Error('oauth-code-exchange-failed');
 const s=await r.json();
 if(typeof s?.access_token!=='string'||s.access_token.length>4096||typeof s?.user?.id!=='string')throw Error('oauth-session-invalid');
 const u=await fetcher(AUTH+'/user',{redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}});
 if(!u.ok)throw Error('oauth-user-verification-failed');
 const user=await u.json();
 if(user?.id!==s.user.id||user.is_anonymous===true||user.app_metadata?.provider==='anonymous')throw Error('oauth-user-invalid');
 return {session:{access_token:s.access_token,user:s.user},user};
}
export async function signInGoogleNormally(label){
 const attempt=createGoogleAttempt();
 let server,timer;
 try{
  const code=await new Promise((resolve,reject)=>{
   let complete=false;
   server=createServer((req,res)=>{
    const code=callbackCode(req);
    const ok=!!code&&!complete;
    res.writeHead(ok?200:400,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store',
     'referrer-policy':'no-referrer','content-security-policy':"default-src 'none'"});
    res.end(ok?'Game QA authorization received. Close this tab and return to PowerShell.':'Invalid or expired Game QA callback.');
    if(ok){complete=true;resolve(code)}
   });
   server.once('error',()=>reject(Error('loopback-listener-unavailable')));
   timer=setTimeout(()=>reject(Error('google-login-timeout')),180000);
   server.listen(8765,'127.0.0.1',()=>{
    console.log('Tester '+label+': sign in using your NORMAL browser. Select the intended registered Google account.');
    console.log('If the browser does not open, copy this authorization URL into normal Chrome or Edge:');
    console.log(attempt.url);
    if(process.platform==='win32'){
     const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',attempt.url],{stdio:'ignore',windowsHide:true});
     child.on('error',()=>{});child.unref();
    }
   });
  });
  return await exchangeGoogleCode(code,attempt.verifier);
 }finally{clearTimeout(timer);server?.closeAllConnections?.();server?.close()}
}
