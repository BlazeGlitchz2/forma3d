'use client';
import {useEffect, useId, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {ThreeMFLoader} from 'three/addons/loaders/3MFLoader.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {ProductKind} from '@/lib/catalog';
import {validateModel} from '@/lib/model-validation';
import {createProductGeometry} from '@/lib/geometry';

export type ModelStats = {dimensions:[number,number,number];volume:number;triangles:number};
type ViewportProps = {
 kind?:ProductKind;color?:string;file?:File|null;compact?:boolean;
 onStats?:(stats:ModelStats)=>void;onError?:(message:string)=>void;
 wireframe?:boolean;size?:number;ar?:boolean;modelUrl?:string;studio?:boolean;
 material?:string;quality?:string;cinematic?:boolean;
};
type ViewportAPI = {reset:()=>void;zoom:(value:number)=>void;view:(value:string)=>void;rotate:(value:number)=>void};
type Tier = 'high'|'medium'|'low';
// Bound GPU ownership even when a long gallery is mounted at once.
const contextOwners = new Set<symbol>();
const waitingViewports = new Map<symbol,()=>void>();
function releaseContext(owner:symbol) {
 waitingViewports.delete(owner);
 if (!contextOwners.delete(owner)) return;
 queueMicrotask(()=>{
  for (const [next, start] of waitingViewports) {
   if (contextOwners.size >= 6) break;
   waitingViewports.delete(next);start();
  }
 });
}
function disposeObject(object:THREE.Object3D, keepMaterial?:THREE.Material) {
 const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>(), textures=new Set<THREE.Texture>();
 object.traverse(node=>{
  if (!(node instanceof THREE.Mesh)) return;
  geometries.add(node.geometry);
  for (const material of Array.isArray(node.material)?node.material:[node.material]) {
   if (material === keepMaterial) continue;
   materials.add(material);
   for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
  }
 });
 geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());
}
export async function parseModel(file:File):Promise<{object:THREE.Object3D;stats:ModelStats}> {
 const bytes=await file.arrayBuffer();const validated=validateModel(new Uint8Array(bytes),file.name);
 let object:THREE.Object3D;
 if (file.name.toLowerCase().endsWith('.stl')) {
  const geometry=toCreasedNormals(new STLLoader().parse(bytes),Math.PI/4);object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
 } else {
  object=new ThreeMFLoader().parse(bytes);
  // 3MF carries triangle positions; Three's loader uses flat-shaded source materials
  // instead of generating normals. Supply face normals before applying our PLA shader.
  const prepared=new Map<THREE.BufferGeometry,THREE.BufferGeometry>();
  object.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||node.geometry.getAttribute('normal'))return;
   const source:THREE.BufferGeometry=node.geometry;
   let geometry=prepared.get(source);
   if(!geometry){const next=source.index?source.toNonIndexed():source;next.computeVertexNormals();prepared.set(source,next);geometry=next}
   node.geometry=geometry;
  });
  prepared.forEach((geometry,source)=>{if(geometry!==source)source.dispose()});
 }
 try {
  object.updateMatrixWorld(true);
  const dimensions=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray() as [number,number,number];
  let volume=0, triangles=0;
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
  object.traverse(node=>{
   if (!(node instanceof THREE.Mesh)) return;
   const geometry=node.geometry, positions=geometry.attributes.position, index=geometry.index;
   const count=index?index.count:positions.count;triangles+=count/3;
   if (triangles>1000000) throw new Error('This model is too detailed. Export fewer than 1 million triangles.');
   for (let i=0;i<count;i+=3) {
    a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(node.matrixWorld);
    b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(node.matrixWorld);
    c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(node.matrixWorld);
    volume+=a.dot(b.cross(c))/6;
   }
  });
  if (!triangles||dimensions.some(d=>!Number.isFinite(d)||d<=0)||!Number.isFinite(volume)) throw new Error('We could not read this model. Export a valid STL or 3MF and try again.');
  // Validation resolves 3MF units and assembly transforms in native millimetres.
  return {object,stats:validated};
 } catch (error) {disposeObject(object);throw error;}
}
function materialResponse(material:string) {
 const name=material.toLowerCase();
 if (name.includes('petg')) return {roughness:.34,clearcoat:.12,transmission:.035,ior:1.57};
 if (name.includes('tpu')) return {roughness:.74,clearcoat:0,transmission:0,ior:1.46};
 if (name.includes('abs')||name.includes('asa')) return {roughness:.51,clearcoat:.025,transmission:0,ior:1.52};
 return {roughness:.57,clearcoat:.01,transmission:0,ior:1.46};
}
const layerHeights:Record<string,number>={fast:.28,standard:.2,smooth:.16,detail:.12};

function ObjectSilhouette({kind,color,uploaded}:{kind:ProductKind;color:string;uploaded:boolean}) {
 const id=useId().replaceAll(':','');
 const shape=uploaded?'M144 105 285 68 356 167 310 405 172 456 106 326Z'
  :kind==='vase'?'M165 75C152 117 121 146 116 222C105 314 148 359 145 452Q226 474 304 452C300 359 348 314 335 222C324 145 296 117 285 75Z'
  :kind==='planter'?'M100 185Q225 153 350 185L313 416Q225 445 137 416Z'
  :kind==='tray'?'M61 279Q222 223 398 278L375 330Q229 382 86 329Z'
  :kind==='lamp'?'M111 226Q225 257 343 226L259 94Q224 82 191 94ZM213 232H238V426H213ZM154 440Q225 405 299 440L293 462Q225 487 160 462Z'
  :kind==='stand'?'M152 131 178 118 262 328 333 314 346 357 241 385 202 345 114 376 109 352 227 313Z'
  :'M81 169Q227 139 367 169L338 413Q224 454 108 413Z';
 const mouth=!uploaded&&(kind==='vase'||kind==='planter'||kind==='organizer'||kind==='tray');
 const mouthY=kind==='vase'?75:kind==='tray'?279:kind==='organizer'?169:185, mouthX=kind==='vase'?60:kind==='tray'?168:kind==='organizer'?143:125;
 return <svg className="object-silhouette" viewBox="0 0 460 560" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`${id}-surface`} x1="0" x2="1"><stop offset="0" stopColor={color}/><stop offset=".32" stopColor={color}/><stop offset="1" stopColor="var(--ink)"/></linearGradient>
   <linearGradient id={`${id}-light`} x1="0" x2="1"><stop stopColor="var(--paper)" stopOpacity=".4"/><stop offset=".43" stopColor="var(--paper)" stopOpacity="0"/><stop offset="1" stopColor="var(--ink)" stopOpacity=".08"/></linearGradient>
   <radialGradient id={`${id}-shadow`}><stop stopColor="var(--ink)" stopOpacity=".21"/><stop offset="1" stopColor="var(--ink)" stopOpacity="0"/></radialGradient>
   <clipPath id={`${id}-clip`}><path d={shape}/></clipPath>
  </defs>
  <ellipse cx="230" cy={kind==='tray'?352:477} rx="134" ry="20" fill={`url(#${id}-shadow)`}/>
  <g transform={kind==='vase'?'rotate(-4 230 290)':undefined}>
   <path d={shape} fill={`url(#${id}-surface)`}/><path d={shape} fill={`url(#${id}-light)`}/>
   <g clipPath={`url(#${id}-clip)`} fill="none" stroke="var(--paper)" strokeOpacity=".17" strokeWidth="3">{Array.from({length:27},(_,i)=><path key={i} d={`M${80+i*12} 58C${44+i*12} 166 ${111+i*12} 294 ${89+i*12} 474`}/>)}</g>
   {mouth&&<><ellipse cx="225" cy={mouthY} rx={mouthX} ry={kind==='tray'?49:14} fill="var(--ink)" fillOpacity=".64"/><ellipse cx="225" cy={mouthY} rx={mouthX} ry={kind==='tray'?49:14} fill="none" stroke={color} strokeWidth="7"/></>}
  </g>
 </svg>;
}

export default function ModelViewport({kind='vase',color='#f2f1ea',file,compact=false,onStats,onError,wireframe=false,size=1,ar=false,modelUrl,studio=false,material='pla',quality='standard',cinematic=false}:ViewportProps) {
 const host=useRef<HTMLDivElement>(null), api=useRef<ViewportAPI|null>(null), updateRef=useRef<(()=>void)|null>(null);
 const configRef=useRef({color,wireframe,size,material,quality}), statsRef=useRef(onStats), errorRef=useRef(onError);
 const [failed,setFailed]=useState(false), [ready,setReady]=useState(false);
 useEffect(()=>{statsRef.current=onStats;errorRef.current=onError;},[onStats,onError]);
 useEffect(()=>{configRef.current={color,wireframe,size,material,quality};updateRef.current?.();},[color,wireframe,size,material,quality]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const owner=Symbol('object-viewport'), reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let unmounted=false, unsupported=false, visible=false, cleanupScene:(()=>void)|null=null, resumeScene:(()=>void)|null=null, retireTimer:ReturnType<typeof setTimeout>|undefined;
  function initialize() {
   if(unmounted||unsupported||!visible||cleanupScene)return;
   if(contextOwners.size>=6){waitingViewports.set(owner,initialize);return;}
   contextOwners.add(owner);
   let renderer:THREE.WebGLRenderer;
   try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:compact?'low-power':'default'});}
   catch{unsupported=true;releaseContext(owner);queueMicrotask(()=>{if(!unmounted)setFailed(true);});return;}
   let disposed=false, frame=0, expensiveRenders=0, interaction=false, revealStart:number|null=null, settleStart:number|null=null, root:THREE.Group|null=null;
   const abort=new AbortController(), hardware=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
   let tier:Tier=hardware.connection?.saveData||(hardware.deviceMemory!==undefined&&hardware.deviceMemory<=4)||navigator.hardwareConcurrency<=4?'low':compact||window.innerWidth<900?'medium':'high';
   const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(studio?27:31,1,.05,150);
   const cameraDirection=new THREE.Vector3(2.4,kind==='tray'?5:2.1,6.8).normalize(), start=new THREE.Vector3(), target=new THREE.Vector3();
   const controls=new OrbitControls(camera,renderer.domElement);
   controls.enablePan=false;controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.85;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
   // Vertical gestures belong to the page; horizontal gestures rotate the object.
   renderer.domElement.style.touchAction='pan-y';
   let touchOrigin:{x:number;y:number;id:number}|null=null, activeTouchCount=0, touchIntent:'scroll'|'rotate'|null=null;
   const onCanvasPointerDown=(event:PointerEvent)=>{
    if(event.pointerType!=='touch')return;
    activeTouchCount++;
    if(activeTouchCount===1){touchOrigin={x:event.clientX,y:event.clientY,id:event.pointerId};touchIntent=null;}
    else if(activeTouchCount>=2){touchIntent='rotate';controls.enableRotate=true;controls.enableZoom=true;}
   };
   const onCanvasPointerMove=(event:PointerEvent)=>{
    if(event.pointerType!=='touch'||!touchOrigin||activeTouchCount>1)return;
    if(event.pointerId!==touchOrigin.id)return;
    if(!touchIntent){
     const dx=Math.abs(event.clientX-touchOrigin.x), dy=Math.abs(event.clientY-touchOrigin.y);
     if(dy>dx&&dy>7){
      touchIntent='scroll';controls.enableRotate=false;
      try{if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);}catch{}
     }else if(dx>=dy&&dx>7){
      touchIntent='rotate';controls.enableRotate=true;
     }
    }
   };
   const onCanvasPointerEnd=(event:PointerEvent)=>{
    if(event.pointerType!=='touch')return;
    activeTouchCount=Math.max(0,activeTouchCount-1);
    if(activeTouchCount===0){touchOrigin=null;touchIntent=null;controls.enableRotate=true;}
   };
   renderer.domElement.addEventListener('pointerdown',onCanvasPointerDown,{passive:true});
   renderer.domElement.addEventListener('pointermove',onCanvasPointerMove,{passive:true});
   renderer.domElement.addEventListener('pointerup',onCanvasPointerEnd,{passive:true});
   renderer.domElement.addEventListener('pointercancel',onCanvasPointerEnd,{passive:true});
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;
   renderer.shadowMap.type=THREE.PCFShadowMap;renderer.setClearColor(0x000000,0);element!.appendChild(renderer.domElement);
   const room=new RoomEnvironment(), pmrem=new THREE.PMREMGenerator(renderer), environment=pmrem.fromScene(room,.045);
   scene.environment=environment.texture;room.dispose();pmrem.dispose();
   scene.add(new THREE.HemisphereLight(0xf8f3e8,0x505363,.44));
   const key=new THREE.DirectionalLight(0xffecdc,2.4);key.position.set(-4,5.5,5);key.castShadow=true;
   key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.bias=-.00035;key.shadow.normalBias=.02;key.shadow.radius=3;scene.add(key);
   const fill=new THREE.DirectionalLight(0xf1f2ff,.45);fill.position.set(4,1,5);scene.add(fill);
   const rim=new THREE.DirectionalLight(0xc4d5ff,1.4);rim.position.set(4.5,3,-4);scene.add(rim);
   const printFrequency={value:2100}, printRelief={value:.000026}, printAxis={value:new THREE.Vector3(0,1,0)};
   const surface=new THREE.MeshPhysicalMaterial({color:configRef.current.color,metalness:0,roughness:.57,envMapIntensity:.45,clearcoat:.01,clearcoatRoughness:.55,wireframe:configRef.current.wireframe});
   // World-space, derivative-filtered FDM layers also work on STL without UVs.
   surface.onBeforeCompile=shader=>{
    shader.uniforms.uPrintFrequency=printFrequency;shader.uniforms.uPrintRelief=printRelief;shader.uniforms.uPrintAxis=printAxis;
    shader.vertexShader='varying vec3 vPrintPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPrintPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader='varying vec3 vPrintPosition;\nuniform float uPrintFrequency;\nuniform float uPrintRelief;\nuniform vec3 uPrintAxis;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     float printPhase = dot(vPrintPosition, uPrintAxis) * uPrintFrequency;
     float printHeight = sin(printPhase) * uPrintRelief * exp(-fwidth(printPhase) * 1.3);
     vec3 printQ0 = dFdx(-vViewPosition);
     vec3 printQ1 = dFdy(-vViewPosition);
     vec3 printS0 = cross(printQ1, normal);
     vec3 printS1 = cross(normal, printQ0);
     float printDet = dot(printQ0, printS0);
     normal = normalize(abs(printDet) * normal - sign(printDet) * (dFdx(printHeight) * printS0 + dFdy(printHeight) * printS1));`);
   };
   surface.customProgramCacheKey=()=> 'forma-world-print-v1';
   const shadowPixels=new Uint8Array(128*128*4);
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const offset=(y*128+x)*4, distance=((x-64)/42)**2+((y-64)/42)**2;
    shadowPixels[offset]=25;shadowPixels[offset+1]=25;shadowPixels[offset+2]=22;shadowPixels[offset+3]=Math.round(115*Math.exp(-distance*2.5));
   }
   const shadowTexture=new THREE.DataTexture(shadowPixels,128,128);shadowTexture.needsUpdate=true;shadowTexture.magFilter=THREE.LinearFilter;
   const floor=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.4),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.8,depthWrite:false}));floor.rotation.x=-Math.PI/2;scene.add(floor);
   const contact=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({opacity:.024}));contact.rotation.x=-Math.PI/2;contact.receiveShadow=true;scene.add(contact);
   const baseRotation=new THREE.Euler(studio?.025:0,-.35,cinematic?-.065:0), pointer=new THREE.Vector2(), pointerTarget=new THREE.Vector2();
   let normalizedHeight=3.2, physicalHeight=160, maxSide=3.2, cameraFitted=false;
   function applyTier(){
    element!.dataset.renderTier=tier.toUpperCase();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,tier==='high'?1.85:tier==='medium'?1.4:1));
    renderer.shadowMap.enabled=tier!=='low';
    const shadowSize=tier==='high'?1024:512;
    if(key.shadow.map&&key.shadow.mapSize.x!==shadowSize){key.shadow.map.dispose();key.shadow.map=null;}
    key.shadow.mapSize.set(shadowSize,shadowSize);
   }
   function fitCamera(){
    if(!root)return;
    const bounds=new THREE.Box3().setFromObject(root);bounds.getCenter(target);target.y-=.025;
    const extent=bounds.getSize(new THREE.Vector3()), right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),cameraDirection).normalize(), up=new THREE.Vector3().crossVectors(cameraDirection,right).normalize();
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);let distance=0;
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
     const corner=new THREE.Vector3(extent.x*x,extent.y*y,extent.z*z);
     distance=Math.max(distance,Math.abs(corner.dot(right))/(tangent*camera.aspect)+corner.dot(cameraDirection),Math.abs(corner.dot(up))/tangent+corner.dot(cameraDirection));
    }
    distance*=cinematic?1.035:compact?1.10:1.13;start.copy(target).addScaledVector(cameraDirection,distance);camera.position.copy(start);controls.target.copy(target);
    controls.minDistance=distance*.55;controls.maxDistance=distance*2.2;controls.update();cameraFitted=true;
   }
   function ensureFraming(){
    if(!root||!cameraFitted)return;
    const bounds=new THREE.Box3().setFromObject(root), corner=new THREE.Vector3(), limit=cinematic?.98:.94;
    // Increasing physical size can enlarge the object, but its rim and base must
    // remain visible. Push the existing view back only when bounds reach an edge.
    for(let attempt=0;attempt<3;attempt++){
     camera.updateMatrixWorld(true);let extent=0;
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      corner.set(x,y,z).project(camera);extent=Math.max(extent,Math.abs(corner.x),Math.abs(corner.y));
     }
     if(extent<=limit)break;
     const offset=camera.position.clone().sub(controls.target).multiplyScalar(extent/limit*1.012);
     camera.position.copy(controls.target).add(offset);controls.maxDistance=Math.max(controls.maxDistance,offset.length()*2.2);controls.update();
    }
   }
   function render(){
    if(disposed||!visible)return;
    if(root)printAxis.value.set(0,1,0).applyQuaternion(root.quaternion);
    const began=performance.now();renderer.render(scene,camera);
    if(performance.now()-began>28&&tier!=='low'){
     expensiveRenders++;if(expensiveRenders>=3){tier=tier==='high'?'medium':'low';applyTier();expensiveRenders=0;resize();}
    }
   }
   resumeScene=render;
   function tick(now:number){
    frame=0;if(disposed||!root)return;let keepGoing=false;
    if(revealStart!==null){
     const progress=Math.min((now-revealStart)/550,1);surface.wireframe=progress<.28||configRef.current.wireframe;surface.opacity=progress<.28?.56:1;surface.transparent=progress<.28||surface.transmission>0;
     if(progress===1)revealStart=null;else keepGoing=true;
    }
    if(settleStart!==null){
     const progress=Math.min((now-settleStart)/700,1), eased=1-Math.pow(1-progress,3);root.rotation.z=baseRotation.z+(1-eased)*.065;root.rotation.y=baseRotation.y+(1-eased)*.13;
     if(progress===1)settleStart=null;else keepGoing=true;
    }
    if(cinematic&&!reducedMotion.matches&&!interaction){pointer.lerp(pointerTarget,.13);root.rotation.x=baseRotation.x+pointer.y*.026;if(settleStart===null)root.rotation.y=baseRotation.y+pointer.x*.055;if(pointer.distanceTo(pointerTarget)>.001)keepGoing=true;}
    render();if(keepGoing)frame=requestAnimationFrame(tick);
   }
   function requestMotion(){if(!frame&&!disposed)frame=requestAnimationFrame(tick);}
   function updateAppearance(){
    const config=configRef.current, response=materialResponse(config.material), finish=config.quality==='fast'?.06:config.quality==='detail'?-.035:config.quality==='smooth'?-.02:0;
    surface.color.set(config.color);surface.roughness=response.roughness+finish;
    const changedTransmission=surface.transmission!==response.transmission;
    surface.clearcoat=response.clearcoat;surface.transmission=response.transmission;surface.ior=response.ior;surface.thickness=.06;
    const revealing=revealStart!==null&&performance.now()-revealStart<154;
    surface.transparent=revealing||response.transmission>0;surface.opacity=revealing?.56:1;surface.wireframe=revealing||config.wireframe;if(changedTransmission)surface.needsUpdate=true;
    printFrequency.value=Math.PI*2*physicalHeight/normalizedHeight/(layerHeights[config.quality]??.2);printRelief.value=config.quality==='fast'?.000043:config.quality==='detail'?.000019:.000026;
    if(root){
     const scale=THREE.MathUtils.clamp(Math.pow(Math.max(config.size,.05),.45),.4,1.32), sizeChanged=Math.abs(root.scale.x-scale)>.0001;root.scale.setScalar(scale);root.updateMatrixWorld(true);
     const bottom=new THREE.Box3().setFromObject(root).min.y;floor.position.y=bottom-.025;contact.position.y=bottom-.035;floor.scale.set(maxSide/3.2,maxSide/3.2,1);
     if(sizeChanged)ensureFraming();
    }
    render();
   }
   updateRef.current=updateAppearance;
   function resize(){
    const {width,height}=element!.getBoundingClientRect();if(width<=0||height<=0)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fitCamera();render();
   }
   applyTier();const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element!);
   const controlsChanged=()=>render(), controlsStarted=()=>{interaction=true;pointerTarget.set(0,0);}, controlsEnded=()=>{interaction=false;};
   controls.addEventListener('change',controlsChanged);controls.addEventListener('start',controlsStarted);controls.addEventListener('end',controlsEnded);
   const pointerMoved=(event:PointerEvent)=>{
    if(!cinematic||reducedMotion.matches||event.pointerType==='touch'||interaction)return;
    const rect=element!.getBoundingClientRect();pointerTarget.set((event.clientX-rect.left)/rect.width*2-1,(event.clientY-rect.top)/rect.height*2-1);requestMotion();
   }, pointerLeft=()=>{pointerTarget.set(0,0);requestMotion();};
   element!.addEventListener('pointermove',pointerMoved);element!.addEventListener('pointerleave',pointerLeft);
   const motionChanged=()=>{if(!reducedMotion.matches)return;pointer.set(0,0);pointerTarget.set(0,0);revealStart=null;settleStart=null;if(root)root.rotation.copy(baseRotation);updateAppearance();};
   reducedMotion.addEventListener('change',motionChanged);
   const contextLost=(event:Event)=>{
    event.preventDefault();unsupported=true;
    if(!unmounted){setFailed(true);setReady(false);queueMicrotask(()=>{cleanupScene?.();cleanupScene=null;});}
   };
   renderer.domElement.addEventListener('webglcontextlost',contextLost);
   api.current={
    reset:()=>{camera.position.copy(start);controls.target.copy(target);controls.update();ensureFraming();render();},
    zoom:value=>{const offset=camera.position.clone().sub(controls.target), distance=THREE.MathUtils.clamp(offset.length()*value,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.setLength(distance));controls.update();render();},
    rotate:value=>{const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),value);camera.position.copy(controls.target).add(offset);controls.update();render();},
    view:value=>{const distance=start.distanceTo(target), direction=new THREE.Vector3(...(value==='top'?[.001,1,.001]:value==='side'?[1,.08,0]:[0,.08,1]) as [number,number,number]).normalize();camera.position.copy(target).addScaledVector(direction,distance);controls.update();ensureFraming();render();},
   };
   cleanupScene=()=>{
    disposed=true;abort.abort();cancelAnimationFrame(frame);resizeObserver.disconnect();
    controls.removeEventListener('change',controlsChanged);controls.removeEventListener('start',controlsStarted);controls.removeEventListener('end',controlsEnded);controls.dispose();
    renderer.domElement.removeEventListener('pointerdown',onCanvasPointerDown);renderer.domElement.removeEventListener('pointermove',onCanvasPointerMove);renderer.domElement.removeEventListener('pointerup',onCanvasPointerEnd);renderer.domElement.removeEventListener('pointercancel',onCanvasPointerEnd);
    element!.removeEventListener('pointermove',pointerMoved);element!.removeEventListener('pointerleave',pointerLeft);reducedMotion.removeEventListener('change',motionChanged);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
    if(root)disposeObject(root,surface);surface.dispose();key.shadow.dispose();environment.dispose();shadowTexture.dispose();floor.geometry.dispose();(floor.material as THREE.Material).dispose();contact.geometry.dispose();(contact.material as THREE.Material).dispose();
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();api.current=null;updateRef.current=null;resumeScene=null;releaseContext(owner);
   };
   async function load(){
    queueMicrotask(()=>{if(!disposed){setFailed(false);setReady(false);}});
    // Procedural catalog geometry resolves synchronously. Let the reset run
    // before publishing readiness, as it already does for an awaited file parse.
    await Promise.resolve();
    if(disposed)return;
    try{
     let modelFile=file;
     if(!modelFile&&modelUrl){
      const response=await fetch(modelUrl,{signal:abort.signal});if(!response.ok)throw new Error('This model is unavailable.');
      const disposition=response.headers.get('content-disposition')??'', extension=/\.3mf/i.test(disposition)||/\.3mf(?:\?|$)/i.test(modelUrl)?'.3mf':'.stl';modelFile=new File([await response.blob()],'model'+extension);
     }
     const parsed=modelFile?await parseModel(modelFile):null, object=parsed?.object??new THREE.Mesh(createProductGeometry(kind),surface);
     if(disposed){disposeObject(object,surface);return;}
     if(parsed)object.rotation.x=-Math.PI/2;
     const originalMaterials=new Set<THREE.Material>(), originalTextures=new Set<THREE.Texture>();
     object.traverse(node=>{
      if(!(node instanceof THREE.Mesh))return;
      for(const previous of Array.isArray(node.material)?node.material:[node.material])if(previous!==surface){originalMaterials.add(previous);for(const value of Object.values(previous))if(value instanceof THREE.Texture)originalTextures.add(value);}
      node.material=surface;node.castShadow=true;node.receiveShadow=true;
     });
     originalTextures.forEach(texture=>texture.dispose());originalMaterials.forEach(previous=>previous.dispose());object.updateMatrixWorld(true);
     const bounds=new THREE.Box3().setFromObject(object), dimensions=bounds.getSize(new THREE.Vector3()), center=bounds.getCenter(new THREE.Vector3()), scale=3.2/Math.max(dimensions.x,dimensions.y,dimensions.z);
     object.position.sub(center);object.scale.multiplyScalar(scale);object.position.multiplyScalar(scale);root=new THREE.Group();root.add(object);root.rotation.copy(baseRotation);scene.add(root);
     normalizedHeight=dimensions.y*scale;physicalHeight=parsed?parsed.stats.dimensions[2]:dimensions.y*100;maxSide=Math.max(dimensions.x,dimensions.z)*scale;
     if(!reducedMotion.matches){if(parsed&&cinematic)revealStart=performance.now();else if(cinematic&&!compact)settleStart=performance.now();}
     updateAppearance();resize();if(parsed)statsRef.current?.(parsed.stats);setReady(true);
     if(revealStart!==null||settleStart!==null)requestMotion();
    }catch(error){if(disposed||abort.signal.aborted)return;errorRef.current?.(error instanceof Error?error.message:'Could not load this model.');setFailed(true);setReady(false);}
   }
   void load();
  }
  const observer=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;clearTimeout(retireTimer);
   if(visible){initialize();resumeScene?.();}else{waitingViewports.delete(owner);retireTimer=setTimeout(()=>{cleanupScene?.();cleanupScene=null;if(!unmounted)setReady(false);},compact?500:1500);}
  },{rootMargin:compact?'100px':'180px'});
  observer.observe(element);
  return()=>{unmounted=true;observer.disconnect();clearTimeout(retireTimer);waitingViewports.delete(owner);cleanupScene?.();cleanupScene=null;releaseContext(owner);};
 },[kind,file,compact,modelUrl,studio,cinematic]);

  return <div className={`model-viewport object-viewport ${compact?'compact':''} ${studio?'studio-viewer':''} ${cinematic?'cinematic-viewer':''} ${ready?'object-ready':''} ${failed?'object-unavailable':''}`} onDragStart={event=>event.preventDefault()}>
  <div className="canvas-host" ref={host} role="img" tabIndex={compact?undefined:0}
   aria-label={failed?(ar?'معاينة ثابتة للقطعة. العرض ثلاثي الأبعاد غير متاح.':'Static object illustration. 3D preview unavailable.'):compact?(ar?'معاينة القطعة':'Object preview'):(ar?'معاينة ثلاثية الأبعاد. اسحب أو استخدم الأسهم لعرض القطعة، وعلامتي زائد وناقص للتكبير.':'Interactive 3D preview. Drag or use arrow keys to view the object. Use plus and minus to zoom.')}
   onKeyDown={event=>{const actions:Record<string,()=>void>={ArrowLeft:()=>api.current?.rotate(-Math.PI/8),ArrowRight:()=>api.current?.rotate(Math.PI/8),ArrowUp:()=>api.current?.view('top'),ArrowDown:()=>api.current?.view('front'),'+':()=>api.current?.zoom(.85),'=':()=>api.current?.zoom(.85),'-':()=>api.current?.zoom(1.15),Home:()=>api.current?.reset()};if(actions[event.key]){event.preventDefault();actions[event.key]();}}}/>
  {!ready&&<div className="model-fallback"><ObjectSilhouette kind={kind} color={color} uploaded={!!(file||modelUrl)}/>{failed&&!compact&&<p role="status">{ar?'المعاينة ثلاثية الأبعاد غير متاحة. يمكنك اختيار خيارات طباعتك.':'3D preview unavailable. You can still choose your print options.'}</p>}</div>}
  {!compact&&!failed&&<div className="drag-hint" aria-hidden="true"><span className="drag-dot"/><span className="drag-text">{ar?'اسحب للتدوير':'DRAG TO ROTATE'}</span></div>}
 </div>;
}
