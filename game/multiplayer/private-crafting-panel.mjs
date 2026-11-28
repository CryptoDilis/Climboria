// Read-only private crafting presentation; never grants crafting authority.
export function createPrivateCraftingPanel({container,readSnapshot,getScope}={}){
 const items=[['fiber','Fiber'],['wood','Wood'],['raw-fish','Raw fish'],['repair-kit','Repair kit'],['cooked-fish','Cooked fish']];
 const recipes=[{id:'repair-kit',label:'Repair kit',station:'Workbench',materials:[['fiber',2],['wood',1]]},{id:'cooked-fish',label:'Cooked fish',station:'Campfire',materials:[['raw-fish',1],['wood',1]]}];
 if(!container?.ownerDocument||typeof container.replaceChildren!=='function'||typeof readSnapshot!=='function'||typeof getScope!=='function')throw Error('Private crafting panel requires authenticated snapshot reader');
 const doc=container.ownerDocument;let generation=0,disposed=false;
 const int=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
 function node(tag,text,cls){const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
 function status(message){const el=node('p',message,'crafting-status');el.setAttribute('role','status');el.setAttribute('aria-live','polite');container.replaceChildren(el);}
 function parse(data){
  if(data?.ok!==true||!int(data.revision,40)||!data.stock||typeof data.stock!=='object'||Object.keys(data.stock).length!==items.length||
   !items.every(([id])=>Object.hasOwn(data.stock,id)&&int(data.stock[id],20)))return null;
  return Object.fromEntries(items.map(([id])=>[id,data.stock[id]]));
 }
 function render(stock){
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
   cards.append(card);
  }
  container.replaceChildren(title,notice,inventory,cards);
 }
 function clear(){generation++;if(!disposed)status('Crafting unavailable.');}
 async function refresh(){
  if(disposed)return false;
  const ticket=++generation,scope=getScope();
  if(typeof scope!=='string'||!scope){status('Sign in to inspect crafting.');return false;}
  status('Loading crafting…');
  let result;try{result=await readSnapshot();}catch{result=null;}
  if(disposed||ticket!==generation)return false;
  if(getScope()!==scope){clear();return false;}
  if(result?.ok===false&&result.reason==='crafting-not-provisioned'){status('No training inventory available.');return false;}
  const stock=parse(result);if(!stock){status('Crafting unavailable.');return false;}
  render(stock);return true;
 }
 function dispose(){generation++;disposed=true;container.replaceChildren();}
 status('Crafting unavailable.');
 return Object.freeze({refresh,clear,dispose});
}
