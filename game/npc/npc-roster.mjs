// Stable, NPC-only identity registry. No human account, presence, chat or economy imports.
// Names are owner-approved; personality and activity preferences are initial defaults.
const definitions=[
 ['aurelion','Aurelion','calm-explorer',['explore','fish']],
 ['kaelvex','KaelVex','competitive-explorer',['explore','gather']],
 ['thornevale','Thornevale','peaceful-gatherer',['farm','gather']],
 ['vengeancepeak','VengeancePeak','mountain-explorer',['explore','rest']],
 ['zevransol','ZevranSol','sociable-swimmer',['swim','fish']]
];
const registry=new Map(definitions.map(([slug,name,personality,preferredActivities],index)=>{
 const id='npc:jarrell-peak:'+slug;
 return [id,Object.freeze({id,kind:'npc',name,label:name+' [NPC]',personality,
  preferredActivities:Object.freeze(preferredActivities),seed:17+index*101})];
}));
export const NPC_ROSTER=Object.freeze([...registry.values()]);
export function getNpcIdentity(id){
 return typeof id==='string'?registry.get(id)??null:null;
}
// Admission count is a caller-supplied tested cap; default is one. A roster
// identity is NOT an active actor, account or entry in the human online count.
export function selectNpcRoster(cap=1){
 if(!Number.isInteger(cap)||cap<0||cap>NPC_ROSTER.length)throw Error('Invalid NPC admission cap');
 return Object.freeze(NPC_ROSTER.slice(0,cap));
}
