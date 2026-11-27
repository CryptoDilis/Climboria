/** Local interactive operator helper. No deployment, no persistent session files.
 * Two disposable registered Game accounts and matching Access email identities.
 * Never run on CI or a shared computer. No credentials in command arguments.
 */
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {signInGoogleNormally} from './preview-google-pkce.mjs';
const GAME='https://climboria.fun',HOST='game-combat-preview.climboria.fun',PREVIEW='https://'+HOST;
const uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function claims(token){
 if(typeof token!=='string'||token.length>4096||!jwt.test(token))return null;
 try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'))}catch{return null}
}
// Decoding is only a local freshness/account consistency check, NOT signature
// verification. Cloudflare and the Worker enforce actual identity/admission.
export function testerCheck({session,user,cookie,now=Date.now()}={}){
 const game=claims(session?.access_token),access=claims(cookie?.value);
 const email=typeof user?.email==='string'?user.email.trim().toLowerCase():'';
 if(!Number.isSafeInteger(now)||!uid.test(user?.id||'')||session?.user?.id!==user.id||
    user.is_anonymous===true||user.app_metadata?.provider==='anonymous'||!email||
    !game||game.sub!==user.id)return 'game-identity-invalid';
 if(!Number.isFinite(game.exp)||game.exp*1000-now<120000)return 'game-session-expiring';
 if(!access||typeof access.email!=='string')return 'access-identity-invalid';
 if(access.email.trim().toLowerCase()!==email)return 'access-email-mismatch';
 if(!Number.isFinite(access.exp)||access.exp*1000-now<120000)return 'access-session-expiring';
 if(cookie.name!=='CF_Authorization'||cookie.secure!==true||
    ![HOST,'.'+HOST].includes(cookie.domain)||cookie.path!=='/')return 'access-cookie-scope-invalid';
 return 'ok';
}
export function inspectTester(input={}){
 if(testerCheck(input)!=='ok')return null;
 const {session,user,cookie}=input;
 const game=claims(session.access_token),access=claims(cookie.value);
 return {id:user.id.toLowerCase(),email:user.email.trim().toLowerCase(),token:session.access_token,access:cookie.value,
  expiresAt:Math.min(game.exp,access.exp)*1000};
}
export function pairCheck(a,b,now=Date.now()){
 if(!a||!b)return 'tester-missing';
 if(a.id===b.id||a.email===b.email||a.token===b.token||a.access===b.access)return 'same-tester';
 if(!(a.expiresAt-now>=120000))return 'tester-a-expiring';
 if(!(b.expiresAt-now>=120000))return 'tester-b-expiring';
 return 'ok';
}
export function distinctTesters(a,b,now=Date.now()){
 return pairCheck(a,b,now)==='ok';
}
async function capture(browser,ask,label,google){
 const ctx=await browser.newContext({serviceWorkers:'block'});let page,stage='browser-setup';
 try{
  page=await ctx.newPage();
  let auth;
  stage='game-sign-in';
  if(google){auth=await signInGoogleNormally(label)}else{
  await page.goto(GAME+'/game/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  await ask('Tester '+label+': sign in to the disposable registered Game account in the browser, then press Enter here. ');
  if(new URL(page.url()).origin!==GAME||new URL(page.url()).pathname!=='/game/index.html')
   throw Error('game-menu-required');
  auth=await page.evaluate(async()=>{
   const auth=typeof heroAuth==='undefined'?null:heroAuth?.auth;
   if(!auth)return null;
   const [s,u]=await Promise.race([Promise.all([auth.getSession(),auth.getUser()]),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('auth-deadline')),15000))]);
   return s?.error||u?.error?null:{session:s?.data?.session,user:u?.data?.user};
  });
  }
  if(!auth)throw Error('registered-session-required');
  console.log('PASS: Tester '+label+' registered Game login.');
  stage='access-navigation';
  await page.goto(PREVIEW+'/',{waitUntil:'domcontentloaded',timeout:30000});
  stage='access-login-incomplete';
  await ask('Tester '+label+': finish Access email PIN login; expect preview-disabled, then press Enter here. ');
  if(new URL(page.url()).origin!==PREVIEW)throw Error('access-login-incomplete');
  stage='disabled-response-check';
  const probe=await ctx.request.get(PREVIEW+'/',{maxRedirects:0,timeout:10000});
  console.log('Tester '+label+' disabled check: HTTP '+probe.status());
  if(probe.status()!==503)throw Error('disabled-preview-required');
  const result=await probe.json();if(result?.error!=='preview-disabled')throw Error('disabled-preview-required');
  stage='single-access-cookie-required';
  const cookies=(await ctx.cookies(PREVIEW+'/')).filter(c=>c.name==='CF_Authorization');
  if(cookies.length!==1)throw Error('single-access-cookie-required');
  const input={...auth,cookie:cookies[0]};
  stage=testerCheck(input);
  const tester=inspectTester(input);
  if(!tester)throw Error('tester-identity-or-freshness');
  console.log('PASS: Tester '+label+' Access identity and session freshness.');
  return {tester,ctx};
 }catch{console.error('Tester '+label+' preparation failed: '+stage);await ctx.close();throw Error('tester-preparation-failed')}
}
async function main(){
 if(process.env.CI||!process.stdin.isTTY||!process.stdout.isTTY||
    ![3,4].includes(process.argv.length)||process.argv[2]!=='PREPARE_PRIVATE_COMBAT_QA'||
    (process.argv.length===4&&process.argv[3]!=='--google')){
  console.error('Refusing: local interactive operator session and explicit preparation required.');
  process.exitCode=1;return;
 }
 // No browser debugging or credential-bearing trace output.
 delete process.env.DEBUG;delete process.env.PWDEBUG;
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:false});
 const rl=createInterface({input:process.stdin,output:process.stdout});
 const ask=q=>rl.question(q),contexts=[];
 const keys=['GAME_PREVIEW_APPROVED_HOST','GAME_PREVIEW_A_JWT','GAME_PREVIEW_B_JWT',
  'GAME_PREVIEW_A_ACCESS_COOKIE','GAME_PREVIEW_B_ACCESS_COOKIE'];
 try{
  console.log('Local preparation only: preview must stay disabled until all operator gates pass.');
  const google=process.argv[3]==='--google';
  const a=await capture(browser,ask,'A',google);contexts.push(a.ctx);
  const b=await capture(browser,ask,'B',google);contexts.push(b.ctx);
  const pair=pairCheck(a.tester,b.tester);
  if(pair!=='ok'){console.error('Tester pair check failed: '+pair);throw Error('two-distinct-testers-required')}
  console.log('PASS: two distinct fresh registered testers.');
  // UUIDs are account identifiers, not passwords. Display locally only so
  // the operator can configure the scoped allowlist; never log tokens.
  console.log('Local-only PREVIEW_ACCOUNT_ALLOWLIST: '+a.tester.id+','+b.tester.id);
  console.log('Do not send this identifier list or session data to chat/GitHub issues.');
  console.log('Only proceed after edge/allowlist checks, cost cap, scoped auth key, fresh disposable namespace and rollback are verified.');
  const answer=await ask('After separately approving and enabling ONE bounded private window, type RUN_PRIVATE_COMBAT_QA (anything else exits without a test): ');
  if(answer!=='RUN_PRIVATE_COMBAT_QA'){console.log('Preparation ended; no combat request sent.');return}
  const ready=pairCheck(a.tester,b.tester);
  if(ready!=='ok'){console.error('Tester pair check failed: '+ready);throw Error('tester-sessions-expired')}
  const values=[HOST,a.tester.token,b.tester.token,a.tester.access,b.tester.access];
  for(let i=0;i<keys.length;i++)process.env[keys[i]]=values[i];
  await import('./preview-staging-qa.mjs');
  console.log('Operator: disable preview immediately, verify disabled response and review usage.');
 }catch{
  console.error('FAIL: local preparation or private QA. No credentials or provider error printed.');
  console.error('Operator: keep/restore preview disabled; do not retry the one-shot window blindly.');
  process.exitCode=1;
 }finally{
  for(const key of keys)delete process.env[key];
  rl.close();await Promise.allSettled(contexts.map(c=>c.close()));await browser.close();
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main()}catch{console.error('FAIL: local operator helper setup.');process.exitCode=1}
}
