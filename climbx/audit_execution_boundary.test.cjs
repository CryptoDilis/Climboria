const test=require('node:test');
const assert=require('node:assert/strict');
const {scanSource,auditDirectory}=require('./audit_execution_boundary.cjs');
test('call site outside source/test implementation is flagged',()=>assert.deepEqual(scanSource(['climbx/new_executor.cjs'],()=> 'evaluateClimbxEntry(input)'),[{file:'climbx/new_executor.cjs',reason:'REVIEW_CALL_SITE'}]));
test('executable true flag in runtime source is flagged',()=>assert.deepEqual(scanSource(['executor.cjs'],()=> 'const x={mayExecute:true};'),[{file:'executor.cjs',reason:'EXECUTABLE_FLAG'}]));
test('no suspicious source returns empty findings',()=>assert.deepEqual(scanSource(['safe.cjs'],()=> 'module.exports={mayExecute:false}'),[]));
test('audit own CLIMBX CJS directory',()=>assert.deepEqual(auditDirectory(),[]));

test('Python source call site is flagged',()=>assert.deepEqual(scanSource(['climbx/runner.py'],()=> 'authorizeBotExecution(order)'),[{file:'climbx/runner.py',reason:'REVIEW_CALL_SITE'}]));
test('Python executable flag is flagged',()=>assert.deepEqual(scanSource(['climbx/runner.py'],()=> 'mayExecute = true'),[{file:'climbx/runner.py',reason:'EXECUTABLE_FLAG'}]));


const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {listSourceFiles}=require('./audit_execution_boundary.cjs');
test('recursive source listing includes nested Python and CJS but skips non-source',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'climbx-audit-'));
 try{
  fs.mkdirSync(path.join(dir,'nested'));
  fs.writeFileSync(path.join(dir,'nested','worker.py'),'pass');
  fs.writeFileSync(path.join(dir,'nested','route.cjs'),'module.exports={}');
  fs.writeFileSync(path.join(dir,'nested','notes.txt'),'skip');
  assert.deepEqual(listSourceFiles(dir),['nested/route.cjs','nested/worker.py']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('recursive audit flags nested call site',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'climbx-audit-'));
 try{
  fs.mkdirSync(path.join(dir,'nested'));
  fs.writeFileSync(path.join(dir,'nested','worker.cjs'),'authorizeBotExecution(input)');
  assert.deepEqual(auditDirectory(dir),[{file:'nested/worker.cjs',reason:'REVIEW_CALL_SITE'}]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('recursive source listing does not follow symlinked external directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'climbx-audit-'));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'climbx-outside-'));
 try{
  fs.writeFileSync(path.join(outside,'worker.cjs'),'mayExecute:true');
  fs.symlinkSync(outside,path.join(dir,'external'),'dir');
  assert.deepEqual(listSourceFiles(dir),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});}
});


test('recursive listing includes JS ESM and TypeScript source extensions',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'climbx-audit-'));
 try{
  for(const name of ['executor.js','executor.mjs','view.jsx','policy.ts','policy.tsx','worker.cjs','worker.py'])fs.writeFileSync(path.join(dir,name),'// source');
  fs.writeFileSync(path.join(dir,'image.png'),'not source');
  assert.deepEqual(listSourceFiles(dir),['executor.js','executor.mjs','policy.ts','policy.tsx','view.jsx','worker.cjs','worker.py']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('TypeScript direct execution call is flagged',()=>assert.deepEqual(scanSource(['nested/worker.ts'],()=> 'authorizeBotExecution(input)'),[{file:'nested/worker.ts',reason:'REVIEW_CALL_SITE'}]));
test('ESM executable flag is flagged',()=>assert.deepEqual(scanSource(['nested/worker.mjs'],()=> 'export const x={mayExecute:true};'),[{file:'nested/worker.mjs',reason:'EXECUTABLE_FLAG'}]));
