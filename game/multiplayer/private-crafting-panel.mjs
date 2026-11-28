// Private crafting presentation; optional intent adapters never grant authority.
export function createPrivateCraftingPanel({container,readSnapshot,getScope,submitCraft=null,submitMeal=null}={}){
 const items=[['fiber','Fiber'],['wood','Wood'],['raw-fish','Raw fish'],['repair-kit','Repair kit'],['cooked-fish','Cooked fish']];
 const recipes=[{id:'repair-kit',label:'Repair kit',station:'Workbench',materials:[['fiber',2],['wood',1]]},{id:'cooked-fish',label:'Cooked fish',station:'Campfire',materials:[['raw-fish',1],['wood',1]]}];
 if(!container?.ownerDocument||typeof container.replaceChildren!=='function'||typeof readSnapshot!=='function'||typeof getScope!=='function')throw Error('Private crafting panel requires authenticated snapshot reader');
 if([submitCraft,submitMeal].some(f=>f!==null&&typeof f!=='function'))throw Error('Invalid private action adapters');
 const doc=container.ownerDocument;let generation=0,disposed=false;
 const int=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
 function node(tag,text,cls){const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
 function status(message){const el=node('p',message,'crafting-status');el.setAttribute('role','status');el.setAttribute('aria-live','polite');container.replaceChildren(el);}
 function parse(data){
  if(data?.ok!==true||!int(data.revision,40)||!data.stock||typeof data.stock!=='object'||Object.keys(data.stock).length!==items.length||
   !items.every(([id])=>Object.hasOwn(data.stock,id)&&int(data.stock[id],20)))return null;
  return Object.fromEntries(items.map(([id])=>[id,data.stock[id]]));
 }
 function render(stock,revision,scope,ticket){
  const title=node('h2','Crafting & cooking','crafting-title');
  const notice=node('p','Private training recipes. Material availability is not permission to craft; the server must verify station and ownership.','crafting-notice');
  const inventory=node('dl',undefined,'crafting-stock');
  for(const [id,label] of items){const row=node('div',undefined,'crafting-stock-row');row.append(node('dt',label),node('dd',String(stock[id])));inventory.append(row);}
  const cards=node('div',undefined,'crafting-recipes');
  for(const recipe of recipes){
   const card=node('section',undefined,'crafting-recipe');
   const list=node('ul',undefined,'crafting-materials');
   const enough=recipe.materials.every(([id,required])=>stock[id]>=required);
   for(const [id,required] of recipe.materials)list.append(node('li',items.find(x=>x[0]===id)[1]+': '+stock[id]+' / '+required));
   const availability=stock[recipe.id]>=20?'Output stack full':enough?'Materials available':'Missing materials';
   card.append(node('h3',recipe.label),node('p','Station: '+recipe.station),list,node('p',availability,'crafting-availability'));
   if(submitCraft)card.append(actionButton('Craft '+recipe.label,submitCraft,recipe.id,!enough||stock[recipe.id]>=20,revision,scope,ticket));
   cards.append(card);
  }
  container.replaceChildren(title,notice,inventory,cards);
  if(submitMeal)container.append(actionButton('Eat cooked fish',submitMeal,'cooked-fish',stock['cooked-fish']===0,revision,scope,ticket));
 }
 function actionButton(label,adapter,item,disabled,revision,scope,ticket){
  const button=node('button',label,'crafting-action');button.type='button';button.disabled=disabled;
  button.addEventListener('click',()=>{if(!button.disabled)void act(adapter,item,revision,scope,ticket);});return button;
 }
 async function act(adapter,item,revision,scope,ticket){
  if(disposed||ticket!==generation||getScope()!==scope)return;
  const actionTicket=++generation;status('Submitting private action…');
  let result;try{result=await adapter({item,revision,scope});}catch{result=null;}
  if(disposed||actionTicket!==generation)return;
  if(getScope()!==scope){clear();return;}
  const message=result?.ok===true?'Action recorded.':result?.ok===false?'Action denied. Inventory refreshed.':'Action outcome uncertain. Inventory refreshed; no automatic retry.';
  await refresh(message);
 }
 function clear(){generation++;if(!disposed)status('Crafting unavailable.');}
 async function refresh(message=null){
  if(disposed)return false;
  const ticket=++generation,scope=getScope();
  if(typeof scope!=='string'||!scope){status('Sign in to inspect crafting.');return false;}
  status('Loading crafting…');
  let result;try{result=await readSnapshot();}catch{result=null;}
  if(disposed||ticket!==generation)return false;
  if(getScope()!==scope){clear();return false;}
  if(result?.ok===false&&result.reason==='crafting-not-provisioned'){status('No training inventory available.');return false;}
  const stock=parse(result);if(!stock){status('Crafting unavailable.');return false;}
  render(stock,result.revision,scope,ticket);if(message){const notice=node('p',message,'crafting-status');notice.setAttribute('role','status');container.append(notice);}return true;
 }
 function dispose(){generation++;disposed=true;container.replaceChildren();}
 status('Crafting unavailable.');
 return Object.freeze({refresh,clear,dispose});
}
