/**
 * NONPRODUCTION one-shot preview budget. No automatic reset or renewal.
 * Uses durable transaction counters, not a billing meter. Integration must
 * reserve before mutation and close sockets when denied. Not production wiring.
 */
export const PREVIEW_BUDGET=Object.freeze({
 windowMs:300000,ticket:24,admission:12,tick:3000,attack:600,disconnect:12
});
const kinds=Object.freeze(['ticket','admission','tick','attack','disconnect']);
const key='game:preview:operation-budget:v1';
const deny=reason=>({ok:false,reason});
const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER-PREVIEW_BUDGET.windowMs;
function valid(row){
 return row&&row.version===1&&time(row.startedAt)&&time(row.lastAt)&&
  row.lastAt>=row.startedAt&&row.lastAt-row.startedAt<=PREVIEW_BUDGET.windowMs&&
  row.counts&&kinds.every(k=>Number.isSafeInteger(row.counts[k])&&
   row.counts[k]>=0&&row.counts[k]<=PREVIEW_BUDGET[k])&&
  row.counts.disconnect<=row.counts.admission;
}
export function createPreviewOperationBudget({storage,clock=()=>Date.now()}={}){
 if(typeof storage?.transaction!=='function'||typeof clock!=='function')
  throw Error('Durable preview budget storage required');
 let unavailable=false;
 // Only a ticket reservation may initialize a new disposable namespace.
 // Admission attempts reserve their own terminal disconnect allowance.
 async function reserve(kind){
  if(!kinds.includes(kind))return deny('invalid-preview-operation');
  if(unavailable)return deny('preview-budget-unavailable');
  try{
   return await storage.transaction(async tx=>{
    const now=clock();if(!time(now))return deny('invalid-preview-time');
    let row=await tx.get(key);
    if(row===undefined){
     if(kind!=='ticket')return deny('preview-budget-not-started');
     row={version:1,startedAt:now,lastAt:now,counts:Object.fromEntries(kinds.map(k=>[k,0]))};
    }
    if(!valid(row)||now<row.lastAt)return deny('invalid-preview-budget');
    const expiresAt=row.startedAt+PREVIEW_BUDGET.windowMs;
    // Terminal cleanup can still spend its reserved allowance after expiry.
    if(kind!=='disconnect'&&now>=expiresAt){
     // Latch observed expiry once so a later clock rollback cannot reopen it.
     if(row.lastAt<expiresAt)await tx.put(key,{...row,lastAt:expiresAt});
     return deny('preview-window-ended');
    }
    if(row.counts[kind]>=PREVIEW_BUDGET[kind]||
       (kind==='disconnect'&&row.counts.disconnect>=row.counts.admission))
     return deny('preview-operation-limit');
    const counts={...row.counts,[kind]:row.counts[kind]+1};
    await tx.put(key,{version:1,startedAt:row.startedAt,lastAt:Math.min(now,expiresAt),counts});
    return {ok:true,expiresAt,remaining:PREVIEW_BUDGET[kind]-counts[kind]};
   });
  }catch{
   unavailable=true;
   return deny('preview-budget-unavailable');
  }
 }
 return Object.freeze({reserve,reviewedForProduction:false});
}
