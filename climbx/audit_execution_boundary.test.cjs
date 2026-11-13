const test=require('node:test');
const assert=require('node:assert/strict');
const {scanSource,auditDirectory}=require('./audit_execution_boundary.cjs');
test('call site outside source/test implementation is flagged',()=>assert.deepEqual(scanSource(['climbx/new_executor.cjs'],()=> 'evaluateClimbxEntry(input)'),[{file:'climbx/new_executor.cjs',reason:'REVIEW_CALL_SITE'}]));
test('executable true flag in runtime source is flagged',()=>assert.deepEqual(scanSource(['executor.cjs'],()=> 'const x={mayExecute:true};'),[{file:'executor.cjs',reason:'EXECUTABLE_FLAG'}]));
test('no suspicious source returns empty findings',()=>assert.deepEqual(scanSource(['safe.cjs'],()=> 'module.exports={mayExecute:false}'),[]));
test('audit own CLIMBX CJS directory',()=>assert.deepEqual(auditDirectory(),[]));
