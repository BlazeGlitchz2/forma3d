import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Euler,Matrix4,PerspectiveCamera,Quaternion,Vector3} from 'three';
import {frameWorldObject} from '../lib/world-framing.ts';

test('an off-origin upload fits the desktop and mobile camera, including perspective depth',()=>{
 for(const aspect of [1440/900,390/844]){
  const bounds=new Box3(new Vector3(-1.9,-1.9,-1.9),new Vector3(1.9,1.9,1.9));
  const position=new Vector3(.38,.16,0),rotation=new Euler(.07,-.35,-.06),scale=1.04;
  const camera=new PerspectiveCamera(32,aspect,.05,80),target=new Vector3();
  camera.position.copy(frameWorldObject(new Vector3(2.5,1.9,8.4),target,bounds,position,rotation,scale,aspect,32));
  camera.lookAt(target);camera.updateMatrixWorld();
  const transform=new Matrix4().compose(position,new Quaternion().setFromEuler(rotation),new Vector3(scale,scale,scale));
  // Project through Three's actual camera; this is independent of the fit calculation.
  for(const x of [-1.9,1.9])for(const y of [-1.9,1.9])for(const z of [-1.9,1.9]){
   const projected=new Vector3(x,y,z).applyMatrix4(transform).project(camera);
   assert.ok(Math.abs(projected.x)<=.90001,'model exceeds horizontal frame');
   assert.ok(Math.abs(projected.y)<=.80001,'model exceeds vertical frame');
   assert.ok(projected.z<1&&projected.z>-1,'model is outside camera depth');
  }
 }
});
