import {createSecondaryEvmWallet} from "./secondary-evm-wallet-readiness.mjs";
const LABELS=Object.freeze({"1":"Ethereum","56":"BNB Chain"});
export function initSecondaryEvmWalletUi({doc=globalThis.document,scope=globalThis.window}={}){
 const get=id=>doc?.getElementById(id);
 const panel=get("secondaryEvmResearch"),chain=get("secondaryEvmChain"),connect=get("secondaryWalletConnect"),disconnect=get("secondaryWalletDisconnect"),status=get("secondaryWalletStatus"),address=get("secondaryWalletAddress");
 if(!panel||!chain||!connect||!disconnect||!status||!address)return {ready:false};
 const context=()=>doc.documentElement.dataset.climboriaSwapNetwork==="base"&&panel.open&&!panel.hidden&&Object.hasOwn(LABELS,chain.value);
 let wallet;
 function render(state){
  const available=context(),name=LABELS[chain.value]||"selected network";
  const valid=available&&state.chainId===Number(chain.value);
  address.textContent=valid&&state.status==="connected-read-only"?state.address:"";
  connect.disabled=!available||(valid&&["connecting","connected-read-only"].includes(state.status));
  disconnect.disabled=!available||state.status==="idle";
  const messages={idle:"No secondary wallet connected.",connecting:"Requesting read-only wallet access…","connected-read-only":"Read-only address · no trading permission.","wrong-chain":"Manually select "+name+" in your wallet, then try again.",invalidated:"Wallet account or network changed. Connect again.","invalid-account":"No valid account shared.",unsupported:"Unsupported network.",unavailable:"Wallet unavailable or permission declined."};
  status.textContent=available?(messages[state.status]||messages.idle):messages.idle;
 }
 wallet=createSecondaryEvmWallet({getProvider:()=>scope?.ethereum,onState:render});
 function reset(){wallet.disconnect();}
 function sync(){if(!context())reset();else render(wallet.snapshot());}
 connect.addEventListener("click",()=>{if(context()&&!connect.disabled){
  // Clear any existing Base local session before a distinct secondary session.
  const base=get("baseWalletDisconnect");if(base&&!base.disabled)base.click();
  void wallet.connect(Number(chain.value));
 }});
 disconnect.addEventListener("click",reset);
 chain.addEventListener("change",reset);
 panel.addEventListener("toggle",sync);
 get("baseWalletConnect")?.addEventListener("click",reset);
 doc.addEventListener?.("climboria:managed-provider-pair-change",sync);
 scope?.addEventListener?.("pagehide",reset);
 scope?.addEventListener?.("popstate",reset);
 sync();
 return {ready:true};
}
if(typeof document!=="undefined"&&typeof window!=="undefined")initSecondaryEvmWalletUi();
