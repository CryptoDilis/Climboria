// Original, low-cost quaternion tracks for the existing Meshy Mixamo skeleton.
// Never replace source GLB bytes or mutate the real player's model.
export function buildNpcActivityClips(T,root,neutralPose){
 const bones=[];root.traverse(b=>{if(b.isBone)bones.push(b)});
 const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const find=s=>bones.find(b=>normalize(b.name)===normalize('mixamorig:'+s));
 const required=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','Spine'];
 if(!required.every(s=>find(s)))throw Error('NPC activity rig missing expected bones');
 const originals=bones.map(b=>b.quaternion.clone());
 const restore=qs=>{bones.forEach((b,i)=>b.quaternion.copy(qs[i]));root.updateWorldMatrix(true,true)};
 function turn(name,childName,xyz){
  const bone=find(name),child=find(childName);
  if(!bone||!child||child.parent!==bone)throw Error('Invalid NPC bone chain');
  root.updateWorldMatrix(true,true);
  const direction=child.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3()));
  if(direction.lengthSq()<1e-8)throw Error('Invalid NPC bone length');
  const delta=new T.Quaternion().setFromUnitVectors(direction.normalize(),new T.Vector3(...xyz).normalize());
  const q=bone.getWorldQuaternion(new T.Quaternion());
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(delta.multiply(q)));
  root.updateWorldMatrix(true,true);
 }
 const result=[];
 try{
  if(neutralPose(root)!==true)throw Error('NPC neutral rig unavailable');
  const neutral=bones.map(b=>b.quaternion.clone());
  const specs=[
   ['NPC_Fish',3.2],['NPC_Farm',1.8],['NPC_Gather',1.8],['NPC_Rest',3],['NPC_Tread',1.6]
  ];
  for(const [name,duration] of specs){
   const frames=9,times=[],values=bones.map(()=>[]);
   for(let i=0;i<frames;i++){
    restore(neutral);
    const phase=2*Math.PI*i/(frames-1),wave=Math.sin(phase),swing=(1-Math.cos(phase))/2;
    if(name==='NPC_Fish'){
     turn('RightArm','RightForeArm',[-.36,-.58,.65+.27*wave]);
     turn('RightForeArm','RightHand',[-.16,-.05+.55*wave,.95]);
     turn('LeftArm','LeftForeArm',[.28,-.75,.45]);
     turn('LeftForeArm','LeftHand',[-.1,-.22,.95]);
    }else if(name==='NPC_Farm'||name==='NPC_Gather'){
     find('Spine').rotateX(.12+.22*swing);
     for(const [side,sign] of [['Left',1],['Right',-1]]){
      turn(side+'Arm',side+'ForeArm',[sign*.28,-.65+.28*wave,.67]);
      turn(side+'ForeArm',side+'Hand',[-sign*.12,-.6+.55*wave,.8]);
     }
    }else if(name==='NPC_Tread'){
     for(const [side,sign] of [['Left',1],['Right',-1]]){
      turn(side+'Arm',side+'ForeArm',[sign*(.65+.2*wave),-.35,.45]);
      turn(side+'ForeArm',side+'Hand',[sign*.45,-.2,.8+.15*wave]);
     }
    }else find('Spine').rotateX(.045+.025*wave);
    times.push(duration*i/(frames-1));
    bones.forEach((b,j)=>values[j].push(...b.quaternion.toArray()));
   }
   result.push(new T.AnimationClip(name,duration,bones.map((b,j)=>new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,values[j]))));
  }
 }finally{restore(originals)}
 return result;
}
