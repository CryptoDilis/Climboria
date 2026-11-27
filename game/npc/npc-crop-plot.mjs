// NPC-only plot lifecycle. No real player inventory, persistence, token or network.
export function createNpcCropPlot({growthSeconds=5}={}){
 if(!Number.isFinite(growthSeconds)||growthSeconds<=0||growthSeconds>120)throw Error('Invalid crop growth');
 let state='empty',remaining=0,planted=0,harvested=0;
 return Object.freeze({
  advance(dt){if(!Number.isFinite(dt)||dt<=0)return;if(state==='growing'){remaining=Math.max(0,remaining-Math.min(.1,dt));if(remaining<=1e-8)state='ripe'}},
  work(){if(state==='empty'){state='growing';remaining=growthSeconds;planted++;return 'planted'}
   if(state==='ripe'){state='empty';remaining=0;harvested++;return 'harvested'}return 'tended'},
  snapshot:()=>Object.freeze({state,remaining,planted,harvested})
 });
}
