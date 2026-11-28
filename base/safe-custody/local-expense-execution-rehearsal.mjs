// Local-only execution evidence after successful authorization reconciliation.
// No public RPC, real funds, liquidity activation or governance change.
import assert from 'node:assert/strict';
const word=n=>BigInt(n).toString(16).padStart(64,'0');
const h=n=>'0x'+word(n);
const aw=a=>'0x'+a.slice(2).padStart(64,'0');
const topic=(cast,s)=>cast('keccak','0x'+Buffer.from(s).toString('hex'));
function matchExecution(x,r){
 const {token,vault,registry,payee,id,evidence,epoch,amount,blockHash,blockNumber,transactionHash,topics}=x;
 assert.equal(r.status,'0x1');assert.equal(r.to,vault);
 assert.equal(r.blockHash,blockHash);assert.equal(r.blockNumber,blockNumber);assert.equal(r.transactionHash,transactionHash);
 const expected=[
  {address:registry,topics:[topics.consumed,evidence,aw(vault),id],data:'0x'},
  {address:token,topics:[topics.transfer,aw(vault),aw(payee)],data:h(amount)},
  {address:vault,topics:[topics.executed,id,h(epoch)],data:h(amount)}
 ];
 assert.equal(r.logs.length,3);
 let previous=-1n;
 for(let i=0;i<3;i++){
  const l=r.logs[i],e=expected[i];
  assert.equal(l.removed,false);assert.equal(l.blockHash,blockHash);assert.equal(l.blockNumber,blockNumber);assert.equal(l.transactionHash,transactionHash);
  assert.match(l.logIndex,/^0x(?:0|[1-9a-f][0-9a-f]*)$/);
  assert.ok(BigInt(l.logIndex)>previous);previous=BigInt(l.logIndex);
  assert.equal(l.address,e.address);assert.deepEqual(l.topics,e.topics);assert.equal(l.data,e.data);
 }
 return true;
}
export async function verifyLocalExpenseExecution(x,authorization){
 const {rpc,call,number,address,record,cast,calldata,creator,wallet,guard,token,vaults,payee,start,sourceSha}=x;
 assert.match(await rpc('web3_clientVersion'),/anvil/i);
 assert.equal(BigInt(await rpc('eth_chainId')),84532n);
 assert.equal(authorization.status,'LOCAL_MINED_AUTHORIZATION_EVIDENCE_ONLY_NO_GO');
 assert.equal(authorization.sourceSha,sourceSha);
 assert.equal(authorization.noPayments,true);
 const rows=authorization.receipts.filter(r=>r.kind==='expense');
 assert.deepEqual(rows.map(r=>r.index),[3,4,5]);
 const amount=10n,epoch=1n,registry=await address(vaults[3].address,'registry()');
 const topics={consumed:topic(cast,'ExpenseConsumed(bytes32,address,bytes32)'),transfer:topic(cast,'Transfer(address,address,uint256)'),executed:topic(cast,'Executed(bytes32,uint256,uint256)')};
 const nonce=await number(wallet,'nonce()');
 const initial=await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address)));
 const balance=()=>number(token,'balanceOf(address)',payee);
 assert.equal(await balance(),0n);
 for(const row of rows){
  const vault=vaults[row.index].address,id=row.id;
  await assert.rejects(rpc('eth_call',[{from:creator,to:vault,data:calldata('execute(bytes32)',id)},'latest']));
 }
 const ready=rows.reduce((m,r)=>BigInt(r.readyAt)>m?BigInt(r.readyAt):m,start);
 assert.ok(ready<start+30n*86400n);
 await rpc('evm_setNextBlockTimestamp',[Number(ready)]);
 await rpc('evm_mine',[]);
 const receipts=[];
 for(const row of rows){
  const vault=vaults[row.index].address,id=row.id,evidence=h(200+row.index);
  assert.equal(await address(vault,'registry()'),registry);
  const data=calldata('execute(bytes32)',id);
  const parent=await rpc('eth_getBlockByNumber',['latest',false]);
  const at=async(tag,to,sig,...args)=>rpc('eth_call',[{to,data:calldata(sig,...args)},tag]);
  const beforeProposal=cast('abi-encode','f(address,uint256,bytes32,uint256,uint256,uint256,bool,bool)',payee,String(amount),evidence,'0',String(epoch),String(BigInt(row.readyAt)),'false','false');
  const afterProposal=cast('abi-encode','f(address,uint256,bytes32,uint256,uint256,uint256,bool,bool)',payee,String(amount),evidence,'0',String(epoch),String(BigInt(row.readyAt)),'true','false');
  assert.equal(await at(parent.number,vault,'proposals(bytes32)',id),beforeProposal);
  assert.deepEqual(row.recipientContext,{recipient:payee,context:'0x0',eligible:true});
  assert.equal(BigInt(await at(parent.number,guard,'expenseContext(address)',payee)),0n);
  assert.equal(BigInt(await at(parent.number,guard,'expenseRecipientAllowed(address)',payee)),1n);
  assert.equal(BigInt(await at(parent.number,vault,'proposalContext(bytes32)',id)),0n);
  assert.equal(await at(parent.number,registry,'consumedBy(bytes32)',evidence),h(0));
  assert.equal(await at(parent.number,registry,'consumedProposal(bytes32)',evidence),h(0));
  const beforePayee=await balance(),beforeVault=await number(token,'balanceOf(address)',vault);
  assert.equal(await number(vault,'totalSpent()'),0n);assert.equal(await number(vault,'spent(uint256)',0),0n);
  const r=await record('local_expense_execution_'+row.index,{from:creator,to:vault,data});
  const block=await rpc('eth_getBlockByHash',[r.blockHash,false]),tx=await rpc('eth_getTransactionByHash',[r.transactionHash]);
  assert.equal(block.hash,r.blockHash);assert.equal(block.number,r.blockNumber);
  assert.equal(block.parentHash,parent.hash);assert.equal(BigInt(block.number),BigInt(parent.number)+1n);
  assert.deepEqual(block.transactions,[r.transactionHash]);
  assert.equal(tx.hash,r.transactionHash);assert.equal(tx.blockHash,block.hash);assert.equal(tx.to,vault);assert.equal(tx.from,creator);assert.equal(tx.input,data);assert.equal(tx.value,'0x0');
  assert.ok(BigInt(block.timestamp)>=ready&&BigInt(block.timestamp)<start+30n*86400n);
  const expected={token,vault,registry,payee,id,evidence,epoch,amount,blockHash:block.hash,blockNumber:block.number,transactionHash:r.transactionHash,topics};
  assert.equal(matchExecution(expected,r),true);
  // Negative checks against the actual receipt without modifying chain state.
  const negatives=[
   z=>z.logs.pop(),z=>z.logs.reverse(),z=>z.logs[0].topics[1]=h(999),z=>z.logs[1].data=h(11),z=>z.logs[1].address=registry,
   z=>z.logs[2].topics[1]=h(999),z=>z.logs[0].removed=true,z=>z.blockHash=h(999)
  ];
  for(const mutate of negatives){const altered=structuredClone(r);mutate(altered);assert.throws(()=>matchExecution(expected,altered));}
  assert.equal(await at(block.number,vault,'proposals(bytes32)',id),afterProposal);
  assert.equal(await at(block.number,registry,'consumedBy(bytes32)',evidence),aw(vault));
  assert.equal(await at(block.number,registry,'consumedProposal(bytes32)',evidence),id);
  assert.equal(BigInt(await at(block.number,token,'balanceOf(address)',vault)),beforeVault-amount);
  assert.equal(BigInt(await at(block.number,token,'balanceOf(address)',payee)),beforePayee+amount);
  assert.equal(BigInt(await at(block.number,vault,'totalSpent()')),amount);
  assert.equal(BigInt(await at(block.number,vault,'spent(uint256)',0)),amount);
  await assert.rejects(rpc('eth_call',[{from:creator,to:vault,data},'latest']));
  assert.equal(await number(wallet,'nonce()'),nonce);assert.equal(await number(guard,'epoch()'),epoch);
  receipts.push({index:row.index,id,evidence,transactionHash:r.transactionHash,blockHash:block.hash,amountRaw:String(amount),recipientContextMatched:true,registryMatched:true,transferMatched:true,executionMatched:true,stateMatched:true,replayRejected:true,alteredReceiptRejections:negatives.length});
 }
 assert.equal(await balance(),3n*amount);
 assert.deepEqual(await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address))),initial.map((v,i)=>i>=3&&i<=5?v-amount:v));
 assert.equal(await number(token,'totalSupply()'),888888888000000n);
 assert.equal(await number(vaults[2].address,'spent()'),0n);
 return {status:'LOCAL_SYNTHETIC_EXPENSE_EXECUTION_ONLY_NO_GO',sourceSha,chainId:84532,receipts,syntheticPaidRaw:'30',unchangedSupply:true,liquidityUnspent:true,publicChainPayments:false,releaseAuthorized:false};
}
