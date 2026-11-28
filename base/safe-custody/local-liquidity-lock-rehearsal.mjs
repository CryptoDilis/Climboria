// Local synthetic pool only; never fund or activate a public DEX.
import assert from 'node:assert/strict';
const h=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const aw=a=>'0x'+a.slice(2).padStart(64,'0');
const zero='0x'+'0'.repeat(40);
export async function verifyLocalLiquidityLock(x,authorization,expense){
 const {rpc,call,number,address,record,cast,calldata,creator,wallet,guard,token,quote,lp,vaults,contracts,verifyLocker,sourceSha}=x;
 assert.match(await rpc('web3_clientVersion'),/anvil/i);
 assert.equal(BigInt(await rpc('eth_chainId')),84532n);
 assert.equal(authorization.sourceSha,sourceSha);assert.equal(expense.sourceSha,sourceSha);
 assert.equal(expense.status,'LOCAL_SYNTHETIC_EXPENSE_EXECUTION_ONLY_NO_GO');
 const rows=authorization.receipts.filter(r=>r.kind==='liquidity');assert.equal(rows.length,1);
 const row=rows[0],id=row.id,vault=vaults[2].address,pool=await address(vault,'pool()');
 assert.equal(await address(vault,'lpCustody()'),lp);
 const state=await call(vault,'actions(bytes32)',id);
 const words=state.slice(2).match(/.{64}/g).map(w=>BigInt('0x'+w));
 assert.equal(words.length,9);
 const [a,q,min,epoch,ready,deadline,executed,cancelled,lockerBefore]=words;
 assert.deepEqual([a,q,min,epoch,ready,executed,cancelled,lockerBefore],[1000n,500n,50n,1n,BigInt(row.readyAt),0n,0n,0n]);
 const now=BigInt((await rpc('eth_getBlockByNumber',['latest',false])).timestamp);
 if(now<ready){await rpc('evm_setNextBlockTimestamp',[Number(ready)]);await rpc('evm_mine',[]);}
 const data=calldata('execute(bytes32)',id);
 const reject=()=>assert.rejects(rpc('eth_call',[{from:creator,to:vault,data},'latest']));
 assert.equal(await number(quote,'balanceOf(address)',vault),0n);await reject();
 // This is a disposable local synthetic ERC20, not public quote funding.
 const funding=await record('local_synthetic_quote_funding',{from:creator,to:quote,data:calldata('transfer(address,uint256)',vault,q)});
 assert.equal(await number(quote,'balanceOf(address)',vault),q);
 const bal=(t,a)=>number(t,'balanceOf(address)',a);
 const nonce=await number(wallet,'nonce()');
 const before=await Promise.all([bal(token,vault),bal(token,pool),bal(quote,pool),number(pool,'totalSupply()')]);
 assert.equal(await number(vault,'spent()'),0n);
 assert.equal(await number(token,'allowance(address,address)',vault,pool),0n);
 assert.equal(await number(quote,'allowance(address,address)',vault,pool),0n);
 const parent=await rpc('eth_getBlockByNumber',['latest',false]);
 const r=await record('local_synthetic_liquidity_execution',{from:creator,to:vault,data});
 const block=await rpc('eth_getBlockByHash',[r.blockHash,false]),tx=await rpc('eth_getTransactionByHash',[r.transactionHash]);
 assert.equal(block.hash,r.blockHash);assert.equal(block.number,r.blockNumber);assert.equal(block.parentHash,parent.hash);
 assert.deepEqual(block.transactions,[r.transactionHash]);assert.equal(tx.input,data);assert.equal(tx.to,vault);assert.equal(tx.from,creator);assert.equal(tx.blockHash,block.hash);
 assert.ok(BigInt(block.timestamp)>=ready&&BigInt(block.timestamp)<deadline);
 const post=await call(vault,'actions(bytes32)',id),pw=post.slice(2).match(/.{64}/g);
 assert.equal(pw.length,9);assert.deepEqual(pw.slice(0,6),state.slice(2).match(/.{64}/g).slice(0,6));
 assert.equal(BigInt('0x'+pw[6]),1n);assert.equal(BigInt('0x'+pw[7]),0n);
 const locker='0x'+pw[8].slice(24);assert.notEqual(locker,zero);
 const unlock=deadline+730n*86400n;
 const provenance=await verifyLocker(locker,{lp:pool,custody:lp,custodyCodeHash:contracts.syntheticLPDestination.runtimeKeccak256,unlockAt:h(unlock)});
 assert.equal(provenance.namedImmutableRolesMatched,true);
 assert.equal(await address(locker,'lp()'),pool);assert.equal(await address(locker,'custody()'),lp);
 assert.equal(await number(locker,'unlockAt()'),unlock);
 const shares=100n,topic=s=>cast('keccak','0x'+Buffer.from(s).toString('hex'));
 const approval=topic('Approval(address,address,uint256)'),transfer=topic('Transfer(address,address,uint256)'),locked=topic('Locked(bytes32,address,uint256,uint256,uint256)');
 const log=(address,topics,data)=>({address,topics,data});
 const approve=(t,n)=>log(t,[approval,aw(vault),aw(pool)],h(n));
 const move=(t,from,to,n)=>log(t,[transfer,aw(from),aw(to)],h(n));
 const expected=[approve(token,a),approve(quote,q),approve(token,0),move(token,vault,pool,a),approve(quote,0),move(quote,vault,pool,q),move(pool,zero,locker,shares),approve(token,0),approve(quote,0),log(vault,[locked,id,aw(locker)],h(a)+h(q).slice(2)+h(shares).slice(2))];
 const match=receipt=>{
  assert.equal(receipt.status,'0x1');assert.equal(receipt.to,vault);assert.equal(receipt.blockHash,block.hash);assert.equal(receipt.transactionHash,r.transactionHash);assert.equal(receipt.blockNumber,block.number);
  assert.equal(receipt.logs.length,expected.length);let prev=-1n;
  for(let i=0;i<expected.length;i++){
   const l=receipt.logs[i];assert.equal(l.removed,false);assert.equal(l.blockHash,block.hash);assert.equal(l.blockNumber,block.number);assert.equal(l.transactionHash,r.transactionHash);
   assert.match(l.logIndex,/^0x(?:0|[1-9a-f][0-9a-f]*)$/);assert.ok(BigInt(l.logIndex)>prev);prev=BigInt(l.logIndex);
   assert.deepEqual({address:l.address,topics:l.topics,data:l.data},expected[i]);
  }
 };
 match(r);
 const mutations=[z=>z.logs.pop(),z=>z.logs.reverse(),z=>z.logs[3].data=h(a+1n),z=>z.logs[6].topics[2]=aw(lp),z=>z.logs[9].topics[1]=h(99),z=>z.logs[9].removed=true];
 for(const mutate of mutations){const z=structuredClone(r);mutate(z);assert.throws(()=>match(z));}
 assert.deepEqual(await Promise.all([bal(token,vault),bal(token,pool),bal(quote,pool),number(pool,'totalSupply()')]),[before[0]-a,before[1]+a,before[2]+q,before[3]+shares]);
 assert.equal(await bal(quote,vault),0n);assert.equal(await bal(pool,locker),shares);assert.equal(await bal(pool,lp),0n);
 assert.equal(await number(token,'allowance(address,address)',vault,pool),0n);assert.equal(await number(quote,'allowance(address,address)',vault,pool),0n);
 assert.equal(await number(vault,'spent()'),a);assert.equal(await number(token,'totalSupply()'),888888888000000n);
 await reject();await assert.rejects(rpc('eth_call',[{from:creator,to:locker,data:calldata('release()')},'latest']));
 assert.equal(await number(wallet,'nonce()'),nonce);assert.equal(await number(guard,'epoch()'),epoch);
 return {status:'LOCAL_SYNTHETIC_LIQUIDITY_LOCK_ONLY_NO_GO',sourceSha,chainId:84532,id,fundingTransactionHash:funding.transactionHash,executionTransactionHash:r.transactionHash,blockHash:block.hash,locker,unlockAt:String(unlock),assetRaw:String(a),quoteRaw:String(q),sharesRaw:String(shares),exactLogsMatched:true,alteredReceiptRejections:mutations.length,unfundedRejected:true,zeroAllowances:true,lockerRuntimeMatched:true,earlyReleaseRejected:true,replayRejected:true,unchangedSupply:true,publicLiquidity:false,releaseAuthorized:false};
}
