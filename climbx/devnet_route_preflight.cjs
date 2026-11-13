'use strict';
// Phase90 CLIMBX-only devnet execution preflight. OFF-CHAIN VALIDATION, NOT TRADING AUTHORITY.
// Deliberately deny all routes until exact reviewed on-chain router constraints exist.
const REQUIRED=['owner','executor','grantId','routerProgramId','routeSchemaHash','cluster'];
function preflightDevnetRoute({request,reviewedRoute}={}){
 const deny=reason=>({status:'BLOCKED',reason,mayExecute:false});
 if(!request||typeof request!=='object'||Array.isArray(request)||!reviewedRoute||typeof reviewedRoute!=='object'||Array.isArray(reviewedRoute))return deny('MISSING_REVIEWED_ROUTE');
 for(const field of REQUIRED){
  if(typeof request[field]!=='string'||!request[field]||typeof reviewedRoute[field]!=='string'||!reviewedRoute[field])return deny('INCOMPLETE_ROUTE');
 }
 if(request.cluster!=='solana:devnet'||reviewedRoute.cluster!=='solana:devnet')return deny('NON_DEVNET');
 if(REQUIRED.some(field=>request[field]!==reviewedRoute[field]))return deny('ROUTE_MISMATCH');
 // A JSON match is not an on-chain proof: malicious CPIs, ALT accounts and token
 // destinations can still bypass off-chain checks. Deny until an audited on-chain
 // program enforces exact instruction/account allowlists and spending limits.
 return deny('ON_CHAIN_ENFORCEMENT_NOT_VERIFIED');
}
module.exports={preflightDevnetRoute};
