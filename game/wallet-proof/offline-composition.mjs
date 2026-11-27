// Offline composition harness only. No listener, deployment config, real provider,
// production account linking or reward authorization. Injected fetch is a fixture.
import {verifyRegisteredAccount} from './registered-account.mjs';
import {OfflineWalletProofStore} from './offline-store.mjs';
const reject=()=>{throw Error('wallet-link-test-rejected');};
const ORIGIN='https://climboria.fun';
function snapshot(body,keys){
 if(!body||typeof body!=='object'||Object.getPrototypeOf(body)!==Object.prototype)reject();
 const fields=Object.getOwnPropertyDescriptors(body);
 if(Reflect.ownKeys(fields).length!==keys.length||keys.some(k=>!Object.hasOwn(fields,k)||!Object.hasOwn(fields[k],'value')))reject();
 return Object.fromEntries(keys.map(k=>[k,fields[k].value]));
}
export function createOfflineLinkHarness({mode,path,fixtureFetch,clock}={}){
 if(mode!=='offline-composition-test'||typeof fixtureFetch!=='function'||typeof clock!=='function')reject();
 const store=new OfflineWalletProofStore(path);
 async function execute(request){
  try{
   const {origin,authorization,operation,body}=snapshot(request,['origin','authorization','operation','body']);
   if(origin!==ORIGIN||typeof authorization!=='string')reject();
   let fields;
   if(operation==='issue'){
    fields=snapshot(body,['address','chain']);
    if(typeof fields.address!=='string'||typeof fields.chain!=='number')reject();
   }else if(operation==='verify'){
    fields=snapshot(body,['id','signature']);
    if(typeof fields.id!=='string'||typeof fields.signature!=='string')reject();
   }else reject();
   // Fresh provider-authenticated identity per operation. The caller cannot
   // supply UID, mode, verification status, nonce, message, or time.
   const identity=await verifyRegisteredAccount(authorization,{publishableKey:'offline-fixture-only',fetchFn:fixtureFetch});
   const user={mode:'synthetic-test',registered:true,id:identity.id};
   const now=clock();
   return operation==='issue'?store.issue(user,fields.address,fields.chain,now):store.verify(user,fields.id,fields.signature,now);
  }catch{reject();}
 }
 return Object.freeze({execute,close:()=>store.close()});
}
