// Offline composition harness only. No listener, deployment config, real provider,
// production account linking or reward authorization. Injected fetch is a fixture.
import {verifyRegisteredAccount} from './registered-account.mjs';
import {OfflineWalletProofStore} from './offline-store.mjs';
const reject=()=>{throw Error('wallet-link-test-rejected');};
const ORIGIN='https://climboria.fun';
function exact(body,keys){
 if(!body||typeof body!=='object'||Object.getPrototypeOf(body)!==Object.prototype)reject();
 const fields=Object.getOwnPropertyDescriptors(body);
 if(Reflect.ownKeys(fields).length!==keys.length||keys.some(k=>!Object.hasOwn(fields,k)||!Object.hasOwn(fields[k],'value')))reject();
}
export function createOfflineLinkHarness({mode,path,fixtureFetch,clock}={}){
 if(mode!=='offline-composition-test'||typeof fixtureFetch!=='function'||typeof clock!=='function')reject();
 const store=new OfflineWalletProofStore(path);
 async function execute(request){
  try{
   exact(request,['origin','authorization','operation','body']);
   if(request.origin!==ORIGIN)reject();
   const {operation,body}=request;
   if(operation==='issue')exact(body,['address','chain']);
   else if(operation==='verify')exact(body,['id','signature']);
   else reject();
   // Fresh provider-authenticated identity per operation. The caller cannot
   // supply UID, mode, verification status, nonce, message, or time.
   const identity=await verifyRegisteredAccount(request.authorization,{publishableKey:'offline-fixture-only',fetchFn:fixtureFetch});
   const user={mode:'synthetic-test',registered:true,id:identity.id};
   const now=clock();
   return operation==='issue'?store.issue(user,body.address,body.chain,now):store.verify(user,body.id,body.signature,now);
  }catch{reject();}
 }
 return Object.freeze({execute,close:()=>store.close()});
}
