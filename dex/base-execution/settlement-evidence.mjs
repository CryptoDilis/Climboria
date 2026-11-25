// Offline consistency only: logs and caller-supplied transaction-local balances are not authenticated state.
import {normalizeExecutionIntent,BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {inspectBaseReceiptCandidate} from "./receipt-evidence.mjs";
const TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const MAX=(1n<<256n)-1n;
const ZERO="0x"+"0".repeat(40);
function uint(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>MAX)throw Error("Invalid decimal amount");return BigInt(v);}
function qty(v){if(typeof v!=="string"||!/^0x(?:0|[1-9a-f][0-9a-f]{0,63})$/.test(v))throw Error("Invalid quantity");return BigInt(v);}
function indexedAddress(v){if(typeof v!=="string"||!/^0x0{24}[0-9a-f]{40}$/.test(v))throw Error("Invalid indexed address");return "0x"+v.slice(-40);}
export function inspectBaseSettlementCandidate(input,expected,evidence,balances,{maxKnownFeeWei}={}){
 if(BASE_EXECUTION_ENABLED!==false)throw Error("Offline settlement must not enable execution");
 const intent=normalizeExecutionIntent(input);
 const receiptEvidence=inspectBaseReceiptCandidate(expected,evidence);
 if(expected.from!==intent.taker)throw Error("Settlement taker mismatch");
 const receipt=evidence.receipt;
 if(!Array.isArray(receipt.logs)||receipt.logs.length===0||receipt.logs.length>512)throw Error("Missing or oversized receipt logs");
 let last=-1n,sold=0n,bought=0n;
 for(const log of receipt.logs){
  if(!log||typeof log!=="object"||Array.isArray(log)||log.removed!==false||
   log.transactionHash!==receipt.transactionHash||log.blockHash!==receipt.blockHash||
   log.blockNumber!==receipt.blockNumber||log.transactionIndex!==receipt.transactionIndex||
   typeof log.address!=="string"||!/^0x[0-9a-f]{40}$/.test(log.address)||
   !Array.isArray(log.topics)||log.topics.length>4||log.topics.some(t=>typeof t!=="string"||!/^0x[0-9a-f]{64}$/.test(t))||
   typeof log.data!=="string"||!/^0x(?:[0-9a-f]{2}){0,32768}$/.test(log.data))throw Error("Malformed or unrelated receipt log");
  const index=qty(log.logIndex);
  if(index<=last)throw Error("Duplicate or unordered log index");last=index;
  if(![intent.sellToken,intent.buyToken].includes(log.address)||log.topics[0]!==TRANSFER)continue;
  if(log.topics.length!==3||!/^0x[0-9a-f]{64}$/.test(log.data))throw Error("Malformed ERC-20 transfer");
  const from=indexedAddress(log.topics[1]),to=indexedAddress(log.topics[2]),amount=BigInt(log.data);
  if(from!==intent.taker&&to!==intent.taker)continue;
  // Narrow route policy: no mint/burn/self transfers or reverse flows involving the taker.
  if(from===to||from===ZERO||to===ZERO)throw Error("Unsupported taker transfer");
  if(log.address===intent.sellToken&&from===intent.taker)sold+=amount;
  else if(log.address===intent.buyToken&&to===intent.taker)bought+=amount;
  else throw Error("Unexpected reverse token flow");
  if(sold>MAX||bought>MAX)throw Error("Transfer sum overflow");
 }
 if(sold!==uint(intent.sellAmount)||bought<uint(intent.minimumBuyAmount))throw Error("Token transfer amount mismatch");
 if(!balances||balances.scope!=="transaction-local"||balances.transactionHash!==receipt.transactionHash||
  balances.blockHash!==receipt.blockHash||balances.taker!==intent.taker||balances.sellToken!==intent.sellToken||
  balances.buyToken!==intent.buyToken)throw Error("Transaction-local balance evidence required");
 const sellDelta=uint(balances.sellBefore)-uint(balances.sellAfter);
 const buyDelta=uint(balances.buyAfter)-uint(balances.buyBefore);
 if(sellDelta!==sold||buyDelta!==bought)throw Error("Balance delta mismatch");
 const l2=qty(receipt.gasUsed)*qty(receipt.effectiveGasPrice),l1=qty(receipt.l1Fee);
 const subtotal=l2+l1,cap=uint(maxKnownFeeWei);
 if(cap===0n||subtotal>MAX||subtotal>cap)throw Error("Known fee subtotal exceeds cap");
 // L1/L2 subtotal excludes unverified operator and any other fees; never label it all-in.
 return Object.freeze({...receiptEvidence,reportedTransferAmountsMatch:true,reportedBalanceDeltasMatch:true,
  reportedSoldRaw:sold.toString(),reportedBoughtRaw:bought.toString(),reportedL2ExecutionFeeWei:l2.toString(),
  reportedL1FeeWei:l1.toString(),reportedKnownFeeSubtotalWei:subtotal.toString(),
  allInFeeVerified:false,operatorFeeVerified:false,transactionLocalBalanceAuthenticated:false,
  tokenSettlementVerified:false,executionReady:false,executable:false});
}
