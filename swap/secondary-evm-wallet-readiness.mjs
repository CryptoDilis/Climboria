// Private candidate: explicit secondary-chain read-only wallet session.
// Not imported by public pages. No switching, approvals, signing or transactions.
const CHAINS=Object.freeze({1:"0x1",56:"0x38"});
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
export function createSecondaryEvmWallet({getProvider=()=>globalThis.ethereum}={}){
 let epoch=0,cleanup=null,state=Object.freeze({status:"idle",chainId:null,address:null});
 const snapshot=()=>state;
 function set(status,chainId=null,address=null){state=Object.freeze({status,chainId,address});return state;}
 function clear(status="idle"){
  ++epoch;const remove=cleanup;cleanup=null;
  if(remove)remove();
  return set(status);
 }
 async function connect(chainId){
  clear();
  if(!Number.isSafeInteger(chainId)||!Object.hasOwn(CHAINS,chainId))return set("unsupported");
  const attempt=epoch,expected=CHAINS[chainId];
  set("connecting",chainId);
  try{
   const provider=getProvider();
   if(!provider||typeof provider.request!=="function"||typeof provider.on!=="function"||typeof provider.removeListener!=="function")return clear("unavailable");
   const events=["accountsChanged","chainChanged","disconnect"];
   const changed=()=>{if(epoch===attempt)clear("invalidated");};
   cleanup=()=>{for(const name of events)try{provider.removeListener(name,changed);}catch{}};
   for(const name of events){
    if(epoch!==attempt)return snapshot();
    provider.on(name,changed);
    // Some providers synchronously emit during registration. Remove even a
    // listener installed after an invalidation fired inside provider.on.
    if(epoch!==attempt){try{provider.removeListener(name,changed);}catch{}return snapshot();}
   }
   if(epoch!==attempt)return snapshot();
   const before=await provider.request({method:"eth_chainId"});
   if(epoch!==attempt)return snapshot();
   if(before!==expected)return clear("wrong-chain");
   const accounts=await provider.request({method:"eth_requestAccounts"});
   if(epoch!==attempt)return snapshot();
   const address=Array.isArray(accounts)?accounts[0]:null;
   if(typeof address!=="string"||!ADDRESS.test(address)||/^0x0{40}$/i.test(address))return clear("invalid-account");
   const after=await provider.request({method:"eth_chainId"});
   if(epoch!==attempt)return snapshot();
   if(after!==expected)return clear("wrong-chain");
   return set("connected-read-only",chainId,address);
  }catch{if(epoch===attempt)return clear("unavailable");return snapshot();}
 }
 return Object.freeze({connect,snapshot,disconnect:()=>clear()});
}
