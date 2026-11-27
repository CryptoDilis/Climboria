// Isolated server-side identity boundary candidate. No public endpoint or wallet linking.
// A server must supply its own fetch and trusted configuration, never client options.
const USER_URL='https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TOKEN=8192,MAX_BODY=65536;
const reject=()=>{throw new Error('registered-account-unverified');};
async function boundedJson(response){
 const declared=response.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))reject();
 if(!response.body)reject();
 const reader=response.body.getReader();let bytes=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BODY){void reader.cancel().catch(()=>{});reject();}parts.push(value);}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
}
export async function verifyRegisteredAccount(authorization,{publishableKey,fetchFn=globalThis.fetch,timeoutMs=3000}={}){
 if(typeof authorization!=='string'||authorization.length>MAX_TOKEN+7||!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization))reject();
 if(typeof publishableKey!=='string'||!publishableKey||publishableKey.length>8192||/[\r\n]/.test(publishableKey)||typeof fetchFn!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)reject();
 const controller=new AbortController();let timer;
 try{
  const deadline=new Promise((_,rej)=>{timer=setTimeout(()=>{controller.abort();rej(new Error('auth-deadline'));},timeoutMs);});
  const lookup=async()=>{
   const response=await fetchFn(USER_URL,{method:'GET',headers:{Authorization:authorization,apikey:publishableKey,Accept:'application/json'},redirect:'error',cache:'no-store',signal:controller.signal});
   if(response.status!==200||response.redirected||response.url&&response.url!==USER_URL)reject();
   if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))reject();
   const user=await boundedJson(response);
   // Explicit false required: absence or ambiguous anonymous status is not proof.
   if(!user||typeof user.id!=='string'||!UUID.test(user.id)||user.is_anonymous!==false||user.app_metadata?.provider==='anonymous')reject();
   return Object.freeze({id:user.id,registered:true});
  };
  return await Promise.race([lookup(),deadline]);
 }catch{reject();}finally{clearTimeout(timer);controller.abort();}
}
