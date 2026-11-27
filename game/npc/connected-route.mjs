// Bounded dry-land connector between existing activity graphs.
// Does not load chunks, move an actor, mutate player state, or grant resources.
const finite=Number.isFinite,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const valid=p=>finite(p?.x)&&finite(p?.z)&&Math.abs(p.x)<=50000&&Math.abs(p.z)<=50000;
export function findConnectedNpcRoute({start,end,sample,canTraverse,grid=12,maxExpanded=256,maxProbes=24000,maxWaypoints=48}={}){
 if(!valid(start)||!valid(end)||dist(start,end)<.01||dist(start,end)>1000||
    typeof sample!=='function'||typeof canTraverse!=='function'||
    !finite(grid)||grid<2||grid>24||!Number.isInteger(maxExpanded)||maxExpanded<1||maxExpanded>512||
    !Number.isInteger(maxProbes)||maxProbes<1||maxProbes>30000||
    !Number.isInteger(maxWaypoints)||maxWaypoints<2||maxWaypoints>48)throw Error('Invalid bounded route inputs');
 let probes=0,expanded=0,exhausted=false;
 function pos(p){
  if(probes>=maxProbes){exhausted=true;return null}
  probes++;
  const s=sample(p.x,p.z);
  if(!s||!finite(s.ground)||s.water!==null)return null;
  return {x:p.x,z:p.z,y:s.ground,swim:false};
 }
 function clear(a,b){
  const count=Math.ceil(dist(a,b)/.29);if(!count)return false;
  let p=pos(a);if(!p)return false;
  for(let i=1;i<=count;i++){
   const q=pos({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count});
   if(!q||Math.abs(q.y-p.y)>.8||canTraverse(p,q)!==true||canTraverse(q,p)!==true)return false;
   p=q;
  }
  return true;
 }
 const result=(points,reason)=>Object.freeze({points:points?Object.freeze(points.map(p=>Object.freeze({x:p.x,z:p.z}))):null,reason,probes,expanded});
 if(!pos(start)||!pos(end))return result(null,exhausted?'probe-budget':'invalid-endpoint');
 if(clear(start,end))return result([start,end],'connected');
 if(exhausted)return result(null,'probe-budget');
 const key=(i,j)=>i+','+j,root={i:0,j:0,x:start.x,z:start.z,g:0,parent:null};
 const best=new Map([[key(0,0),root]]),open=[root],closed=new Set(),edgeCache=new Map();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(open.length&&expanded<maxExpanded&&!exhausted){
  open.sort((a,b)=>(a.g+dist(a,end))-(b.g+dist(b,end))||dist(a,end)-dist(b,end));
  const n=open.shift(),id=key(n.i,n.j);
  if(closed.has(id)||best.get(id)!==n)continue;
  closed.add(id);expanded++;
  if(dist(n,end)<=grid*1.5&&(dist(n,end)<.01||clear(n,end))){
   const points=dist(n,end)<.01?[]:[end];
   for(let p=n;p;p=p.parent)points.unshift(p);
   return points.length<=maxWaypoints?result(points,'connected'):result(null,'waypoint-budget');
  }
  for(const [di,dj] of dirs){
   if(exhausted)break;
   const i=n.i+di,j=n.j+dj,k=key(i,j);
   if(closed.has(k))continue;
   const p={i,j,x:start.x+i*grid,z:start.z+j*grid,g:n.g+Math.hypot(di,dj)*grid,parent:n};
   if(!valid(p)||dist(p,start)+dist(p,end)>dist(start,end)+240||(best.get(k)?.g??Infinity)<=p.g)continue;
   const edge=[id,k].sort().join('|');
   let safe=edgeCache.get(edge);
   if(safe===undefined){safe=clear(n,p);edgeCache.set(edge,safe)}
   if(!safe)continue;
   best.set(k,p);open.push(p);
  }
 }
 return result(null,exhausted?'probe-budget':expanded>=maxExpanded?'expansion-budget':'no-route');
}
