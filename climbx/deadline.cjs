// Non-deploying timeout boundary for wallet API operations.
// Caller MUST still configure actual HTTP server request/header timeouts.
// AbortSignal timeout is advisory to dependencies; this wrapper bounds
// response latency even when an injected dependency ignores cancellation.
// SECURITY: timeout rejection does NOT cancel database queries, prevent a late
// COMMIT, or prove rollback. Do not wrap live state-changing operations with
// this helper as a substitute for database-level timeouts and reconciliation.
function withDeadline(operation,{timeoutMs=5000,setTimeoutFn=setTimeout,clearTimeoutFn=clearTimeout}={}){
 if(typeof operation!=='function')throw new TypeError('operation required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError('invalid timeout');
 return (...args)=>{
  const controller=new AbortController();
  let timer;
  const timeout=new Promise((_,reject)=>{
   timer=setTimeoutFn(()=>{controller.abort();reject(Object.assign(new Error('operation deadline exceeded'),{code:'CLIMBX_DEADLINE'}));},timeoutMs);
  });
  let task;
  try{task=Promise.resolve(operation(...args,controller.signal));}catch(err){task=Promise.reject(err);}
  return Promise.race([task,timeout]).finally(()=>clearTimeoutFn(timer));
 };
}
module.exports={withDeadline};
