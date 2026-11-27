// Clear the in-memory browser connection on page exit, including BFCache.
// This does not revoke wallet permissions or mutate any game account.
window.addEventListener('pagehide',()=>document.getElementById('baseWalletDisconnect')?.click());
