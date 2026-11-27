// Owns teardown of a paired local visual allocation. Each step is independent;
// detach references even when an individual renderer resource throws.
export function releaseNpcVisuals(visuals,{detach,disposeHero,releaseLoading,releaseResident,closeProjections=true}){
 let errors=0;
 const attempt=fn=>{try{fn()}catch{errors++}};
 for(const v of visuals){
  if(v.released)continue;
  v.released=true;
  const {group,label,gltf,projection,loading,resident}=v;
  // A projection may still refer to v.group during its close callback.
  if(closeProjections&&projection)attempt(()=>projection.close());
  v.group=null;v.label=null;v.gltf=null;v.projection=null;v.loading=false;v.resident=false;
  if(group)attempt(()=>detach(group));
  if(label){attempt(()=>label.material.map?.dispose());attempt(()=>label.material.dispose())}
  if(gltf)attempt(()=>disposeHero(gltf.scene));
  if(loading)attempt(releaseLoading);
  if(resident)attempt(releaseResident);
 }
 return errors;
}
