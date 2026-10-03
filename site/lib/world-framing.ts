import {Box3,Euler,Matrix4,Quaternion,Vector3} from 'three';

/** Fit a transformed volume using perspective depth, including its nearest corner. */
export function frameWorldObject(camera:Vector3,target:Vector3,bounds:Box3,position:Vector3,rotation:Euler,scale:number,aspect:number,fov:number){
 const direction=camera.clone().sub(target).normalize();
 const right=new Vector3().crossVectors(new Vector3(0,1,0),direction).normalize();
 const up=new Vector3().crossVectors(direction,right).normalize();
 const transform=new Matrix4().compose(position,new Quaternion().setFromEuler(rotation),new Vector3(scale,scale,scale));
 const tangent=Math.tan(fov*Math.PI/360),vertical=.8,horizontal=.9;
 let distance=camera.distanceTo(target);
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const point=new Vector3(x,y,z).applyMatrix4(transform).sub(target);
  distance=Math.max(distance,point.dot(direction)+Math.max(Math.abs(point.dot(right))/(tangent*aspect*horizontal),Math.abs(point.dot(up))/(tangent*vertical)));
 }
 return target.clone().addScaledVector(direction,distance);
}
