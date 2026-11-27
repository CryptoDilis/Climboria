// Own a tiny visible NPC-only crop plot. Existing player farming/economy untouched.
export function createNpcPlotVisual(T,scene,groundAt,node){
 if(!Number.isFinite(node?.x)||!Number.isFinite(node?.z)||typeof groundAt!=='function')throw Error('Crop anchor required');
 const group=new T.Group();group.name='NPC-owned-crop-plot';
 const soilGeo=new T.BoxGeometry(1.7,.08,1.7),plantGeo=new T.CylinderGeometry(.055,.075,.65,5);
 const soilMat=new T.MeshLambertMaterial({color:0x66503a}),plantMat=new T.MeshLambertMaterial({color:0x81ad45});
 const soil=new T.Mesh(soilGeo,soilMat);group.add(soil);
 const plants=[];
 for(const x of [-.52,0,.52])for(const z of [-.52,0,.52]){
  const p=new T.Mesh(plantGeo,plantMat);p.position.set(x,0,z);group.add(p);plants.push(p);
 }
 group.position.set(node.x,groundAt(node.x,node.z)+.06,node.z);scene.add(group);
 let closed=false;
 function update(s){
  if(closed)return false;
  const scale=s.state==='ripe'?1:s.state==='growing'?Math.max(.12,Math.min(.95,1-s.remaining/5)):.0;
  for(const p of plants){p.visible=scale>0;p.scale.y=Math.max(.01,scale);p.position.y=.325*scale+.04}
  plantMat.color.setHex(s.state==='ripe'?0xe1bc5e:0x81ad45);
  return true;
 }
 function close(){if(closed)return;closed=true;scene.remove(group);soilGeo.dispose();plantGeo.dispose();soilMat.dispose();plantMat.dispose()}
 update({state:'empty',remaining:0});
 return Object.freeze({group,plants,update,close,audit:()=>({closed,attached:group.parent===scene,visiblePlants:plants.filter(p=>p.visible).length})});
}
