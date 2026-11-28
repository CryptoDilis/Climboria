// Private read-only equipment presentation; host must invalidate on session changes.
export function createPrivateEquipmentPanel({container,readSnapshot,getScope}={}){
 if(!container?.ownerDocument||typeof container.replaceChildren!=='function'||typeof readSnapshot!=='function'||typeof getScope!=='function')
  throw Error('Explicit private equipment panel and authenticated reader required');
 const doc=container.ownerDocument;let generation=0,disposed=false;
 const within=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 function node(tag,text,cls){
  const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;
 }
 function status(message){
  const el=node('p',message,'equipment-status');el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  container.replaceChildren(el);
 }
 function parse(data){
  if(data?.ok!==true||data.item!=='training-climbing-gloves'||data.material!=='training-repair-fiber'||
   !within(data.enhancement,10)||!within(data.remainingMaterials,55)||!within(data.durability,100)||data.durability%10!==0||
   !within(data.remainingRepairKits,3)||!within(data.maintenanceRevision,153)||
   data.remainingMaterials+data.enhancement*(data.enhancement+1)/2>55)return null;
  return {enhancement:data.enhancement,remainingMaterials:data.remainingMaterials,durability:data.durability,remainingRepairKits:data.remainingRepairKits};
 }
 function render(data){
  const title=node('h2','Equipment','equipment-title');
  const item=node('h3','Training climbing gloves +'+data.enhancement,'equipment-item');
  const label=node('p','Durability: '+data.durability+'/100','equipment-durability-label');
  const meter=node('progress',undefined,'equipment-meter');meter.setAttribute('max','100');meter.setAttribute('value',String(data.durability));
  meter.setAttribute('aria-label','Equipment durability');
  const condition=node('p',data.durability===0?'Broken — repair required':data.durability===100?'Fully repaired':'Worn — repair available','equipment-condition');
  const list=node('dl',undefined,'equipment-details');
  for(const [name,value] of [['Enhancement','+'+data.enhancement+' / +10'],['Repair fiber',String(data.remainingMaterials)],['Fixture repair kits',String(data.remainingRepairKits)]]){
   const row=node('div',undefined,'equipment-row');row.append(node('dt',name),node('dd',value));list.append(row);
  }
  container.replaceChildren(title,item,label,meter,condition,list);
 }
 function clear(){generation++;if(!disposed)status('Equipment unavailable.');}
 async function refresh(){
  if(disposed)return false;
  const ticket=++generation,scope=getScope();
  if(typeof scope!=='string'||!scope){status('Sign in to inspect equipment.');return false;}
  status('Loading equipment…');
  let result;try{result=await readSnapshot();}catch{result=null;}
  if(disposed||ticket!==generation)return false;
  if(getScope()!==scope){clear();return false;}
  if(result?.ok===false&&result.reason==='equipment-not-provisioned'){status('No equipment available.');return false;}
  const data=parse(result);if(!data){status('Equipment unavailable.');return false;}
  render(data);return true;
 }
 function dispose(){generation++;disposed=true;container.replaceChildren();}
 status('Equipment unavailable.');
 return Object.freeze({refresh,clear,dispose});
}
