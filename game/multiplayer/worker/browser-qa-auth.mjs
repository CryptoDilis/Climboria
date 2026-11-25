/**
 * Game-only manual real-browser staging QA auth request. Playwright serializes
 * this function into the owned first-party Game tab via page.evaluate().
 * Never print or return tokens, passwords, Supabase errors, or user IDs.
 *
 * Supabase auth has no AbortSignal here. Timeout cancels the local wait only;
 * the operator script closes its private browser contexts on any failure.
 */
export async function requestBoundedGameQaAuth({action,email,password,timeoutMs=20000,surface='play'}={}){
 if(!['sign-in','sign-out'].includes(action)||!['play','menu'].includes(surface)||
    !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000||
    (action==='sign-in'&&(!email||!password||
      typeof email!=='string'||typeof password!=='string')))
  throw Error('Invalid Game QA auth request');
 const auth=surface==='menu'?(typeof heroAuth==='undefined'?null:heroAuth?.auth):window.__CLIMBORIA_GAME_SAVE_CLIENT?.auth;
 if(!auth)return false;
 let timer;
 const timeout=new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error('Game QA auth deadline expired')),timeoutMs);
 });
 try{
  const result=await Promise.race([
   Promise.resolve().then(()=>action==='sign-in'?
    auth.signInWithPassword({email,password}):auth.signOut()),
   timeout
  ]);
  // Do not mistake an empty/undefined provider reply for successful logout.
  if(action==='sign-out')return !!result&&typeof result==='object'&&result.error===null;
  const session=result?.data?.session;
  const user=session?.user||result?.data?.user;
  return result?.error==null&&!!session?.access_token&&
   typeof user?.id==='string'&&user.id.length>0&&
   user.is_anonymous!==true&&user.app_metadata?.provider!=='anonymous';
 }catch(error){
  // Neither a provider's error nor a JWT/password is allowed into QA logs.
  if(error?.message==='Game QA auth deadline expired')
   throw Error('Game QA auth deadline expired');
  return false;
 }finally{clearTimeout(timer)}
}
