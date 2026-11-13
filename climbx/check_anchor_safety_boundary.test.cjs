'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('./check_anchor_safety_boundary.cjs');
test('actual scaffold retains static grant/revoke safeguards', () => {
 const r = inspect();
 assert.equal(r.scaffoldSafetyChecksPass,true);
 assert.equal(r.checks.placeholderProgramId,true);
 assert.equal(r.checks.hasExecutionInstruction,false);
 assert.equal(r.realFundsAllowed,false);
});
test('missing owner signer fails closed', () => {
 const source = "pub owner: Account<'info, Grant>";
 assert.equal(inspect(source).scaffoldSafetyChecksPass,false);
});
test('an execution instruction never grants deployment approval', () => {
 const source = "pub fn execute_trade(";
 const r = inspect(source);
 assert.equal(r.checks.hasExecutionInstruction,true);
 assert.equal(r.deploymentApproved,false);
 assert.equal(r.realFundsAllowed,false);
});
