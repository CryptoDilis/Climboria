'use strict';
// Fail-closed static safety boundary: development scaffold must not be mistaken for deployable execution.
const fs = require('node:fs');
const path = require('node:path');
const programPath = path.join(__dirname, 'programs/climbx-authorization/src/lib.rs');
function inspect(source = fs.readFileSync(programPath, 'utf8')) {
  const checks = {
    ownerSignerRequired: /pub owner:\s*Signer<'info>/.test(source),
    ownerRevokeRequired: /has_one\s*=\s*owner/.test(source),
    fiveMintLimit: /\(1\.\.=5\)\.contains\(&allowed_mints\.len\(\)\)/.test(source) || /allowed_mints\.len\(\)\s*<=\s*5/.test(source),
    expirationBound: /expires_at\s*<=\s*max_expiry/.test(source),
    perOrderCap: /per_order_cap\s*>\s*0/.test(source),
    cumulativeCap: /cumulative_cap\s*>=\s*per_order_cap/.test(source),
    duplicateMintRejection: /DuplicateMint/.test(source),
    placeholderProgramId: /declare_id!\("11111111111111111111111111111111"\)/.test(source),
    hasExecutionInstruction: /pub fn (execute_trade|execute_swap|execute_order)\s*\(/.test(source)
  };
  return {
    checks,
    scaffoldSafetyChecksPass: Object.entries(checks).filter(([k]) => !['placeholderProgramId','hasExecutionInstruction'].includes(k)).every(([,v])=>v),
    programIdConfigured: !checks.placeholderProgramId,
    executionInstructionPresent: checks.hasExecutionInstruction,
    executable: false,
    deploymentApproved: false,
    realFundsAllowed: false,
    missingEvidence: [
      ...(checks.placeholderProgramId ? ['NON_PLACEHOLDER_PROGRAM_ID'] : []),
      ...(!checks.hasExecutionInstruction ? ['SCOPED_EXECUTION_INSTRUCTION'] : []),
      'SIGNED_VALIDATOR_TESTS','ONCHAIN_EXECUTION_AUTHORIZATION','INDEPENDENT_AUDIT','RELEASE_APPROVAL'
    ]
  };
}
if (require.main === module) {
  const result = inspect();
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if (!result.scaffoldSafetyChecksPass) process.exitCode = 1;
}
module.exports = { inspect };
