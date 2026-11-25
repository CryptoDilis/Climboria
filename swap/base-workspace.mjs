/**
 * Base-specific wallet/price UI visibility on Swap.
 * Both underlying DEX modules are read-only: this controller cannot fetch
 * prices, request chain switching, sign or submit a transaction.
 */
export function initBaseSwapWorkspace(doc=globalThis.document) {
 const panel=doc?.getElementById?.("baseSwapWorkspace");
 const chainBase=doc?.getElementById?.("chainBase");
 const amount=doc?.getElementById?.("basePriceAmount");
 const disconnect=doc?.getElementById?.("baseWalletDisconnect");
 if(!panel||!chainBase||!amount||!disconnect) return {ready:false};
 let wasBase=false;
 function sync() {
  const selected=doc.documentElement?.dataset?.climboriaSwapNetwork==="base";
  panel.hidden=!selected;
  if(wasBase&&!selected) {
   // Abort any in-flight indicative quote through the existing DEX price
   // component's input-epoch handler. Never let Base output persist in Solana.
   amount.value="";
   const EventCtor=doc.defaultView?.Event;
   if(typeof amount.dispatchEvent==="function"&&typeof EventCtor==="function")
    amount.dispatchEvent(new EventCtor("input",{bubbles:true}));
   // Locally invalidate the EIP-1193 session (does not revoke wallet grants).
   // If a connect is pending, this increments the existing epoch and fences it.
   if(!disconnect.disabled) disconnect.click();
  }
  wasBase=selected;
 }
 doc.addEventListener?.("climboria:managed-provider-pair-change",sync);
 sync();
 return {ready:true,sync};
}
if(typeof document!=="undefined")initBaseSwapWorkspace(document);
