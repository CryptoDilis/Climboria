// Real, read-only Base EIP-1967 risk inspection on two public RPC roots.
// Never requests wallet access, approvals, firm quotes or transactions.
import assert from "node:assert/strict";
import {corroborateBaseProxyControl} from "../../dex/base-execution/eip1967-proxy-observation.mjs";

const secondary=process.env.BASE_SECONDARY_RPC_URL;
if(!secondary)throw Error("Secondary keyless public RPC URL not configured");
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const weth="0x4200000000000000000000000000000000000006";
for(const [sellToken,buyToken,sellAmount] of [[usdc,weth,"100000"],[weth,usdc,"100000000000000"]]){
 const evidence=await corroborateBaseProxyControl({
  chainId:8453,sellToken,buyToken,sellAmount,minimumBuyAmount:"1",taker:usdc
 },{secondaryRpcUrl:secondary});
 assert.equal(evidence.readOnly,true);
 assert.equal(evidence.executable,false);
 assert.equal(evidence.executionReady,false);
 assert.equal(evidence.providerIndependenceVerified,false);
 assert.equal(evidence.sourceBinaryParityVerified,false);
 assert.equal(evidence.transferSemanticsVerified,false);
 console.log(JSON.stringify({
  chainId:8453,token:sellToken,block:evidence.block,blockHash:evidence.hash,
  implementation:evidence.implementation,admin:evidence.admin,beacon:evidence.beacon,
  implementationCodeSha256:evidence.implementationCodeSha256,
  beaconCodeSha256:evidence.beaconCodeSha256,
  warnings:evidence.warnings,
  sameStateAcrossHosts:evidence.twoHostsAgreed,
  verifiedIndependentOperators:false,tradeEnabled:false
 }));
}
console.log("PASS: USDC and WETH EIP-1967 proxy-slot risk observations matched two public Base RPC URLs at exact block hashes. Not independent operator proof, source audit, finality, safe-transfer determination or trading go-live.");
