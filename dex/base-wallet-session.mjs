// Base-only, read-only EIP-1193 session. No network switching, signing or transactions.
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
export function baseAccount(accounts){
 if(!Array.isArray(accounts)||typeof accounts[0]!=="string"||!ADDRESS.test(accounts[0])||/^0x0{40}$/i.test(accounts[0]))return null;
 return accounts[0];
}
export function initBaseWallet(doc=globalThis.document,{getProvider=()=>globalThis.ethereum}={}){
 const connect=doc.getElementById("baseWalletConnect"),disconnect=doc.getElementById("baseWalletDisconnect"),status=doc.getElementById("baseWalletStatus"),address=doc.getElementById("baseWalletAddress");
 if(!connect||!disconnect||!status||!address)return;
 let epoch=0,session=null,cleanup=null;
 const reset=(message="Base wallet not connected.")=>{
  ++epoch;
  const remove=cleanup;cleanup=null;session=null;
  if(remove)remove();
  address.textContent="";status.textContent=message;connect.disabled=false;disconnect.disabled=true;
 };
 reset();
 disconnect.addEventListener("click",()=>reset("Base wallet session cleared locally. No wallet permissions were revoked."));
 connect.addEventListener("click",async()=>{
  if(connect.disabled)return;
  reset();const attempt=epoch;connect.disabled=true;disconnect.disabled=false;status.textContent="Connecting Base wallet…";
  let provider;
  try{
   provider=getProvider();
   if(!provider||typeof provider.request!=="function"||typeof provider.on!=="function"||typeof provider.removeListener!=="function"){
    reset("No compatible browser EVM wallet found. Use a wallet extension or wallet browser.");return;
   }
   // Install listeners before awaiting anything. Never reuse an account after an event.
   const changed=()=>{if(epoch===attempt)reset("Wallet account or network changed. Connect again on Base.");};
   const events=["accountsChanged","chainChanged","disconnect"];
   cleanup=()=>{for(const event of events)try{provider.removeListener(event,changed);}catch{}};
   for(const event of events)provider.on(event,changed);
   if(await provider.request({method:"eth_chainId"})!=="0x2105"){
    if(epoch===attempt)reset("Switch your wallet to Base mainnet (8453), then connect again.");return;
   }
   if(epoch!==attempt)return;
   const account=baseAccount(await provider.request({method:"eth_requestAccounts"}));
   if(epoch!==attempt)return;
   if(!account){reset("No valid wallet account was shared.");return;}
   const chain=await provider.request({method:"eth_chainId"});
   if(epoch!==attempt)return;
   if(chain!=="0x2105"){reset("Wallet is not on Base mainnet. Connect again on Base.");return;}
   session=account;address.textContent=session;status.textContent="Base wallet connected · read-only. No trading permissions granted.";
   connect.disabled=true;disconnect.disabled=false;
  }catch{
   if(epoch===attempt)reset("Base wallet connection unavailable or declined. No transaction prepared.");
  }
 });
}
if(typeof document!=="undefined")initBaseWallet(document);
