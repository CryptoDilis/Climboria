// Offline receipt correlation only. Caller-provided RPC data is not authenticated finality.
import {BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
const hash=(v)=>{if(typeof v!=="string"||!/^0x[0-9a-f]{64}$/.test(v)||/^0x0{64}$/.test(v))throw Error("Invalid hash");return v;};
const addr=(v)=>{if(typeof v!=="string"||!/^0x[0-9a-f]{40}$/.test(v)||/^0x0{40}$/.test(v))throw Error("Invalid address");return v;};
const quantity=(v)=>{if(typeof v!=="string"||!/^0x(?:0|[1-9a-f][0-9a-f]{0,63})$/.test(v))throw Error("Invalid quantity");return BigInt(v);};
const data=(v)=>{if(typeof v!=="string"||!/^0x(?:[0-9a-f]{2}){4,32768}$/.test(v))throw Error("Invalid calldata");return v;};
function object(v){if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Missing evidence");return v;}
export function inspectBaseReceiptCandidate(expected,evidence){
 if(BASE_EXECUTION_ENABLED!==false)throw Error("Offline receipt policy must not enable execution");
 object(expected);object(evidence);
 const {transaction:tx,receipt,canonicalBlock,finalizedBlock}=evidence;
 [tx,receipt,canonicalBlock,finalizedBlock].forEach(object);
 if(expected.chainId!==8453||evidence.chainId!=="0x2105"||tx.chainId!=="0x2105")throw Error("Base chain mismatch");
 const txHash=hash(expected.transactionHash), from=addr(expected.from),to=addr(expected.to);
 if(from===to)throw Error("Unexpected self transaction");
 if(hash(tx.hash)!==txHash||hash(receipt.transactionHash)!==txHash)throw Error("Transaction hash mismatch");
 if(addr(tx.from)!==from||addr(receipt.from)!==from||addr(tx.to)!==to||addr(receipt.to)!==to)throw Error("Transaction participant mismatch");
 if(data(tx.input)!==data(expected.input)||quantity(tx.value)!==0n)throw Error("Transaction envelope mismatch");
 if(receipt.status!=="0x1"||receipt.contractAddress!==null)throw Error("Receipt not successful contract call");
 const blockHash=hash(receipt.blockHash),height=quantity(receipt.blockNumber);
 if(hash(tx.blockHash)!==blockHash||quantity(tx.blockNumber)!==height||
    hash(canonicalBlock.hash)!==blockHash||quantity(canonicalBlock.number)!==height)throw Error("Canonical block mismatch");
 const index=quantity(receipt.transactionIndex);
 if(quantity(tx.transactionIndex)!==index||!Array.isArray(canonicalBlock.transactions)||index>=BigInt(canonicalBlock.transactions.length)||
    canonicalBlock.transactions[Number(index)]!==txHash)throw Error("Transaction inclusion mismatch");
 const finalizedHeight=quantity(finalizedBlock.number),finalizedHash=hash(finalizedBlock.hash);
 if(finalizedHeight<height||(finalizedHeight===height&&finalizedHash!==blockHash))throw Error("Reported finalized block does not cover receipt");
 const gas=quantity(receipt.gasUsed),limit=quantity(tx.gas),price=quantity(receipt.effectiveGasPrice);
 if(gas===0n||gas>limit||price===0n)throw Error("Invalid receipt gas evidence");
 // No log, token balance delta, L1 fee, ancestry, signature or RPC authenticity proof.
 return Object.freeze({chainId:8453,transactionHash:txHash,blockHash,blockNumber:receipt.blockNumber,
  reportedFinalizedBlockNumber:finalizedBlock.number,reportedFinalizedBlockHash:finalizedHash,
  receiptCandidateOnly:true,observationOnly:true,receiptStatusObserved:true,
  reportedInclusionConsistent:true,reportedFinalizedHeightCoversReceipt:true,
  executionReady:false,executable:false,receiptFinalityVerified:false,
  tokenSettlementVerified:false,walletAuthorizationVerified:false,providerIndependenceVerified:false});
}
