'use strict';
// Phase112: localhost-only Solana JSON-RPC health probe. Read-only; never submits transactions.
// Run only against a disposable local validator, not public or remote RPC.
const http=require('node:http');
function probeLocalValidator({host='127.0.0.1',port=8899,timeoutMs=3000}={}){
 if(host!=='127.0.0.1'||!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000)
  return Promise.resolve({healthy:false,mayExecute:false,reason:'INVALID_LOCAL_ENDPOINT'});
 return new Promise(resolve=>{
  let settled=false;
  const finish=(healthy,reason)=>{if(!settled){settled=true;resolve({healthy,mayExecute:false,reason})}};
  const request=http.request({host,port,method:'POST',path:'/',headers:{'content-type':'application/json'},timeout:timeoutMs},response=>{
   let data='';
   response.on('data',chunk=>{data+=chunk;if(data.length>8192){request.destroy();finish(false,'OVERSIZED_RPC_RESPONSE')}});
   response.on('end',()=>{
    try{
     const body=JSON.parse(data);
     finish(response.statusCode===200&&body.jsonrpc==='2.0'&&body.id===1&&body.result==='ok','RPC_HEALTH_CHECK');
    }catch{finish(false,'INVALID_RPC_RESPONSE')}
   });
  });
  request.on('timeout',()=>{request.destroy();finish(false,'RPC_TIMEOUT')});
  request.on('error',()=>finish(false,'RPC_UNREACHABLE'));
  request.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'getHealth',params:[]}));
 });
}
module.exports={probeLocalValidator};
