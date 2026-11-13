'use strict';
// Phase95: CLIMBX-only execution boundary. No transaction execution capability exists.
// Neither wallet ownership, local simulation, nor devnet tool presence can authorize a swap.
function authorizeBotExecution({walletBinding,policySimulation,grantSimulation,routePreflight,onChainProof}={}){
 const blocked=reason=>({authorized:false,mayExecute:false,reason});
 try {
 if(walletBinding?.status!=='BOUND_CONFIRMED')return blocked('WALLET_NOT_VERIFIED');
 if(policySimulation?.allowed!==true)return blocked('POLICY_NOT_SATISFIED');
 if(policySimulation?.simulationOnly!==true||policySimulation?.mayExecute!==false)return blocked('INVALID_POLICY_BOUNDARY');
 if(grantSimulation?.ok!==true||grantSimulation?.simulationOnly!==true||grantSimulation?.mayExecute!==false)return blocked('INVALID_SIMULATION_BOUNDARY');
 if(routePreflight?.mayExecute!==false)return blocked('INVALID_ROUTE_BOUNDARY');
 // No verified Solana grant program / signed finality proof is integrated.
 // Never trust caller-provided "onChainProof" JSON, even if it says verified.
 void onChainProof;
 return blocked('ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED');
 } catch {
  // Hostile getters/proxies must not turn a deny-only boundary into an exception.
  return blocked('INVALID_AUTHORIZATION_INPUT');
 }
}
module.exports={authorizeBotExecution};
