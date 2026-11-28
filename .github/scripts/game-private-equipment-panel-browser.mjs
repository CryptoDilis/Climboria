import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1200,height:800},{width:360,height:640}]){
  const page=await browser.newPage({viewport});
  try{
   await page.route(base+'/__private-equipment-ci-only.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/game/multiplayer/private-equipment-panel.css"><main id="equipment" class="private-equipment-panel"></main></html>'}));
   await page.goto(base+'/__private-equipment-ci-only.html');
   await page.evaluate(async()=>{
    const {createPrivateEquipmentPanel}=await import('/game/multiplayer/private-equipment-panel.mjs');
    let scope='fixture-session';
    const snapshot={ok:true,item:'training-climbing-gloves',material:'training-repair-fiber',enhancement:5,remainingMaterials:40,durability:30,remainingRepairKits:2,maintenanceRevision:9};
    let reader=async()=>snapshot;
    const panel=createPrivateEquipmentPanel({container:document.querySelector('#equipment'),getScope:()=>scope,readSnapshot:()=>reader()});
    window.fixture={panel,setScope:v=>{scope=v},setReader:v=>{reader=v},snapshot};
    await panel.refresh();
   });
   assert.match(await page.locator('.equipment-item').innerText(),/\+5/);
   assert.equal(await page.locator('progress').getAttribute('value'),'30');
   assert.equal(await page.locator('.equipment-row').count(),3);
   const geometry=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,font:parseFloat(getComputedStyle(document.querySelector('.equipment-row')).fontSize),columns:getComputedStyle(document.querySelector('.equipment-row')).gridTemplateColumns.split(' ').length}));
   assert.equal(geometry.fits,true);assert.ok(geometry.font>=16);assert.equal(geometry.columns,viewport.width<440?1:2);
   await page.evaluate(async()=>{const f=window.fixture;let resolve;f.setReader(()=>new Promise(r=>{resolve=r}));const pending=f.panel.refresh();f.setScope(null);f.panel.clear();resolve(f.snapshot);if(await pending!==false)throw Error('stale equipment accepted')});
   assert.equal(await page.locator('progress').count(),0);assert.match(await page.locator('[role=status]').innerText(),/unavailable/);
   console.log('Private equipment panel passed at '+viewport.width+'x'+viewport.height);
  }finally{await page.close()}
 }
}finally{await browser.close()}
