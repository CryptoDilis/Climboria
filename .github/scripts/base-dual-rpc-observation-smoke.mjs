// Live Base DEX read-only observation; no wallet, secret, approval, signing,
// 0x route or transaction. Two PUBLIC RPC hostnames are not by themselves proof
// of distinct node operators or authenticated blockchain finality.
import assert from "node:assert/strict";
import {corroborateBaseAllowanceObservation} from "../../dex/base-execution/dual-rpc-observation.mjs";

const SECONDARY=process.env.BASE_SECONDARY_RPC_URL;
if(!SECONDARY)throw Error("Explicit public secondary Base RPC URL required");
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const weth="0x4200000000000000000000000000000000000006";
// This contract is a PUBLIC, non-personal fixture; NOT a funded owner account.
for(const [sellToken,buyToken,sellAmount] of [
 [usdc,weth,"100000"],[weth,usdc,"100000000000000"]
]){
 const result=await corroborateBaseAllowanceObservation({
  chainId:8453,sellToken,buyToken,sellAmount,minimumBuyAmount:"1",
  taker:usdc
 },{secondaryRpcUrl:SECONDARY});
 assert.equal(result.chainId,8453);
 assert.equal(result.executable,false);
 assert.equal(result.observationOnly,true);
 assert.equal(result.providerIndependenceVerified,false);
 assert.match(result.observedBlockHash,/^0x[0-9a-f]{64}$/);
 assert.match(result.observedSellTokenCodeSha256,/^[0-9a-f]{64}$/);
 console.log(JSON.stringify({
  chain:8453,token:sellToken,block:result.observedBlock,
  hash:result.observedBlockHash,tokenCodeSha256:result.observedSellTokenCodeSha256,
  observedAllowance:result.observedAllowance,
  observedBalance:result.observedBalance,
  next:result.next,executed:false,providerIndependenceVerified:false
 }));
}
console.log("PASS: two Base public RPC hosts agreed on identical EIP-1898 block identity, token code, balance and allowance for both exact token directions. This is NOT independent operator attestation, finality, wallet authorization or executable trading.");
