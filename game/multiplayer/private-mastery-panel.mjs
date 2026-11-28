// Private presentation only; no public transport, credit or session persistence.
export function createPrivateMasteryPanel({container,readSnapshot,getScope}={}){
 const skills=[['climbing','Climbing'],['swimming','Swimming'],['fishing','Fishing'],['farming','Farming'],['combat','Combat'],['endurance','Endurance'],['survival','Survival'],['crafting','Crafting'],['treasure-hunting','Treasure hunting'],['weapon-handling','Weapon handling']];
 const ranks=new Set(['Novice','Apprentice','Skilled','Expert','Master']);
 if(!container?.ownerDocument||typeof container.replaceChildren!=='function'||typeof readSnapshot!=='function'||typeof getScope!=='function')
  throw Error('Explicit private mastery panel and authenticated snapshot reader required');
 const doc=container.ownerDocument;
 let generation=0,disposed=false;
 function node(tag,text,cls){
  const el=doc.createElement(tag);
  if(text!==undefined)el.textContent=text;
  if(cls)el.className=cls;
  return el;
 }
 function showStatus(message){
  const status=node('p',message,'mastery-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  container.replaceChildren(status);
 }
 function parse(result){
  if(result?.ok!==true||!Array.isArray(result.skills)||result.skills.length!==skills.length)return null;
  const byId=new Map();
  for(const entry of result.skills){
   if(!entry||!skills.some(([id])=>id===entry.skill)||byId.has(entry.skill)||!ranks.has(entry.rank)||
    !Number.isSafeInteger(entry.validatedActivities)||entry.validatedActivities<0||
    (entry.validatedActivities===0&&entry.rank!=='Novice'))return null;
   byId.set(entry.skill,{rank:entry.rank,count:entry.validatedActivities});
  }
  return byId;
 }
 function render(byId){
  const title=node('h2','Skill mastery','mastery-title');
  const description=node('p','Independent activity ranks. No global character level.','mastery-description');
  const list=node('dl',undefined,'mastery-skills');
  for(const [id,label] of skills){
   const {rank,count}=byId.get(id);
   const row=node('div',undefined,'mastery-row');
   row.append(node('dt',label,'mastery-skill'),node('dd',rank+' · '+String(count)+' verified activities','mastery-progress'));
   list.append(row);
  }
  container.replaceChildren(title,description,list);
 }
 // Owner must invalidate on logout/session change. A refresh always clears
 // previous results immediately and rejects late results from earlier scopes.
 function clear(){
  generation++;
  if(!disposed)showStatus('Skill mastery unavailable.');
 }
 async function refresh(){
  if(disposed)return false;
  const ticket=++generation;
  const scope=getScope();
  if(typeof scope!=='string'||!scope){showStatus('Sign in to view skill mastery.');return false;}
  showStatus('Loading skill mastery…');
  let result;
  try{result=await readSnapshot();}catch{result=null;}
  if(disposed||ticket!==generation)return false;
  if(getScope()!==scope){clear();return false;}
  const data=parse(result);
  if(!data){showStatus('Skill mastery unavailable.');return false;}
  render(data);return true;
 }
 function dispose(){generation++;disposed=true;container.replaceChildren();}
 showStatus('Skill mastery unavailable.');
 return Object.freeze({refresh,clear,dispose});
}
