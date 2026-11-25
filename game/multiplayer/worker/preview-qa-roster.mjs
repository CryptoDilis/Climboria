/** Shared browser-side roster checkpoint. No credentials, network, or side effects outside inbox. */
export function consumePreviewRoster({ids,inbox=globalThis.__privateQa?.inbox}){
 if(!Array.isArray(ids)||!Array.isArray(inbox)||!ids.length||
    new Set(ids).size!==ids.length||!ids.every(id=>typeof id==='string'&&/^s_[a-f0-9]{32}$/.test(id)))return false;
 const index=inbox.findIndex(m=>m?.type==='preview-peers'&&Array.isArray(m.ids)&&
  m.ids.length===ids.length&&new Set(m.ids).size===ids.length&&ids.every(id=>m.ids.includes(id)));
 if(index<0)return false;
 // Consume the matching checkpoint AND every earlier roster. An initial
 // one-player roster must never certify a subsequent player disconnect.
 // Preserve unrelated messages and all later roster transitions.
 for(let i=index;i>=0;i--)if(inbox[i]?.type==='preview-peers')inbox.splice(i,1);
 return true;
}
