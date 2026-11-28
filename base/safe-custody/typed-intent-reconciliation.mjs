// Offline typed intent derivation for the exact review-only Reserve ABI.
// Inputs must come from independently authenticated historical configuration and
// Safe transaction data. This module does not recover signatures or prove finality.
import {execFileSync} from 'node:child_process';
import {matchAuthorizationReceipt} from './authorization-receipt-match.mjs';
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const shape=(o,keys)=>need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),'SHAPE');
const q=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'QUANTITY');return BigInt(x);};
const hex=x=>'0x'+x.toString(16);
const word=x=>x.toString(16).padStart(64,'0');
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x)&&BigInt(x)>0n;
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&BigInt(x)>0n;
const zero='0x'+'0'.repeat(40);
const labels=['ECOSYSTEM','COMMUNITY','TREASURY'];
const selectors={expense:'be61343e',liquidity:'ae7b6095'};
function keccak(words){
 const input='0x'+words.join('');
 need(/^0x(?:[0-9a-f]{64})+$/.test(input),'HASH_INPUT');
 const out=execFileSync('cast',['keccak',input],{encoding:'utf8',timeout:5000,maxBuffer:1024,stdio:['ignore','pipe','ignore']}).trim();
 need(hash(out),'HASH_OUTPUT');return out;
}
export function deriveTypedIntent(c,t){
 shape(c,['chainId','blockNumber','blockHash','timestamp','transactionHash','safe','guard','safeTxHash','token','epoch','expenseVaults','liquidityVault','quote','pool']);
 shape(t,['to','operation','value','safeTxGas','baseGas','gasPrice','gasToken','refundReceiver','data']);
 need(c.chainId===84532&&q(c.blockNumber)>0n&&hash(c.blockHash)&&hash(c.transactionHash)&&hash(c.safeTxHash),'CONTEXT');
 const now=q(c.timestamp),epoch=q(c.epoch);
 need(now>0n&&now<=2n**256n-1n-2592000n&&epoch>0n,'CONTEXT_RANGE');
 need(Array.isArray(c.expenseVaults)&&c.expenseVaults.length===3,'VAULTS');
 const roles=[c.safe,c.guard,c.token,c.liquidityVault,c.quote,c.pool,...c.expenseVaults];
 need(roles.every(addr)&&new Set(roles).size===roles.length,'ROLE_CONTEXT');
 need(t.to===c.guard&&t.operation===0&&[t.value,t.safeTxGas,t.baseGas,t.gasPrice].every(x=>x==='0x0')&&t.gasToken===zero&&t.refundReceiver===zero,'SAFE_BOUNDARY');
 need(typeof t.data==='string'&&/^0x[0-9a-f]+$/.test(t.data),'CALLDATA');
 const selector=t.data.slice(2,10);
 const kind=selector===selectors.expense?'expense':selector===selectors.liquidity?'liquidity':null;
 need(kind!==null&&t.data.length===2+8+(kind==='expense'?10:8)*64,'SELECTOR_LENGTH');
 const w=t.data.slice(10).match(/.{64}/g),n=i=>BigInt('0x'+w[i]);
 need(n(0)===epoch,'EPOCH');
 const va=n(w.length-2),vu=n(w.length-1);
 need(va<=now&&vu>now&&vu>va&&vu-va<=86400n,'SIGNED_WINDOW');
 const common={kind,chainId:84532,blockNumber:c.blockNumber,blockHash:c.blockHash,transactionHash:c.transactionHash,safe:c.safe,safeTxHash:c.safeTxHash,epoch:c.epoch,readyAt:hex(now+172800n)};
 if(kind==='expense'){
  const i=n(1);need(i>=3n&&i<=5n,'VAULT_INDEX');
  need(/^0{24}[0-9a-f]{40}$/.test(w[2]),'ADDRESS_WORD');
  const recipient='0x'+w[2].slice(24),evidence='0x'+w[4];
  need(addr(recipient)&&n(2)!==1n&&n(3)>0n&&hash(evidence)&&n(5)<60n&&n(6)>0n&&n(7)%2n===0n,'EXPENSE_FIELDS');
  const idx=Number(i-3n),vault=c.expenseVaults[idx],purpose=Buffer.from(labels[idx],'ascii').toString('hex').padEnd(64,'0');
  const id=keccak([word(84532n),word(BigInt(vault)),word(BigInt(c.token)),purpose,w[0],...w.slice(2,8)]);
  return {...common,vault,id,recipient,evidence,amount:hex(n(3))};
 }
 need(n(1)>0n&&n(2)>0n&&n(3)>0n&&n(4)>now+172800n&&n(4)-now<=2592000n&&n(5)>0n,'LIQUIDITY_FIELDS');
 const vault=c.liquidityVault,id=keccak([word(84532n),word(BigInt(vault)),word(BigInt(c.token)),word(BigInt(c.quote)),word(BigInt(c.pool)),...w.slice(0,6)]);
 return {...common,vault,id,assetAmount:hex(n(1)),quoteAmount:hex(n(2)),deadline:hex(n(4))};
}
export function reconcileTypedIntent(c,t,receipt){
 return matchAuthorizationReceipt(deriveTypedIntent(c,t),receipt);
}
