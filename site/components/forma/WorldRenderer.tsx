'use client';

import {useEffect, useRef, type RefObject} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createProductGeometry} from '@/lib/geometry';
import {frameWorldObject} from '@/lib/world-framing';
import {parseModel} from './ModelViewport';
import type {WorldCommand,WorldScene} from './MaterialWorld';

type Props={scene:WorldScene;commandRef:RefObject<((command:WorldCommand)=>void)|null>;onReady:(value:boolean)=>void;onFailed:(value:boolean)=>void};

function disposeTree(object:THREE.Object3D,keep?:THREE.Material|THREE.Material[]){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const retained=new Set(Array.isArray(keep)?keep:keep?[keep]:[]);
  object.traverse(node=>{if(node instanceof THREE.Mesh||node instanceof THREE.Points||node instanceof THREE.Line){geometries.add(node.geometry);for(const mat of Array.isArray(node.material)?node.material:[node.material])if(!retained.has(mat)){materials.add(mat);for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value)}}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}

function physicalResponse(name:string,finish:string){
  const silk=/silk/i.test(name),petg=/petg/i.test(name),soft=/tpu/i.test(name);
  return {roughness:finish==='sanded'?.78:silk?.3:petg?.34:soft?.8:.62,clearcoat:silk?.16:petg?.1:0,transmission:petg?.045:0,ior:petg?1.57:1.46};
}

export default function WorldRenderer({scene:state,commandRef,onReady,onFailed}:Props){
  const host=useRef<HTMLDivElement>(null),stateRef=useRef(state),updateRef=useRef<(()=>void)|null>(null);
  useEffect(()=>{stateRef.current=state;updateRef.current?.()},[state]);
  useEffect(()=>{
    const element=host.current;if(!element)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{onFailed(true);return;}
    let disposed=false,frame=0,root:THREE.Group|null=null,sourceKey='',loadGeneration=0,revealAt=0,transitionAt=performance.now(),interacting=false,slowFrames=0;
    let points:THREE.Points|null=null,construction:THREE.Box3Helper|null=null,physicalHeight=160,normalizedHeight=3.8;
    let localBounds:THREE.Box3|null=null,pendingEdges:THREE.Group|null=null;
    const hardware=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
    let tier=hardware.connection?.saveData||(hardware.deviceMemory??8)<=4||hardware.hardwareConcurrency<=4?0:innerWidth<800?1:2;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),world=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(32,1,.05,80),cameraGoal=new THREE.Vector3(3,1.9,7.2),look=new THREE.Vector3(),lookGoal=new THREE.Vector3();
    camera.position.copy(cameraGoal);
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.localClippingEnabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;renderer.domElement.style.touchAction='pan-y';element.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,element);controls.enablePan=false;controls.enableZoom=false;controls.enableRotate=false;controls.target.copy(look);
    const room=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(room,.055);room.dispose();generator.dispose();world.environment=environment.texture;
    const key=new THREE.DirectionalLight(0xfff1df,2);key.position.set(-3.5,5,4.5);key.castShadow=true;
    key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.0003;key.shadow.normalBias=.025;
    const fill=new THREE.DirectionalLight(0xcbd4ff,.35);fill.position.set(4,1.8,5);
    const rim=new THREE.DirectionalLight(0xdbe8ff,2.6);rim.position.set(3,4,-3);
    world.add(key,fill,rim,new THREE.HemisphereLight(0xd4e2ff,0x101725,.32));
    const printFrequency={value:2000},relief={value:.000035},printAxis={value:new THREE.Vector3(0,1,0)},printOrigin={value:new THREE.Vector3()},printScale={value:1},sliceHeight={value:0},sliceActive={value:0};
    const surface=new THREE.MeshPhysicalMaterial({color:0xefeee5,roughness:.62,metalness:0,envMapIntensity:.45});
    // Lines have no reliable fragment derivatives for physical surface relief.
    const structureSurface=new THREE.MeshBasicMaterial({color:0xb9cdee,wireframe:true});
    surface.onBeforeCompile=shader=>{
      shader.uniforms.uFrequency=printFrequency;shader.uniforms.uRelief=relief;shader.uniforms.uPrintAxis=printAxis;shader.uniforms.uPrintOrigin=printOrigin;shader.uniforms.uPrintScale=printScale;shader.uniforms.uSliceHeight=sliceHeight;shader.uniforms.uSliceActive=sliceActive;
      shader.vertexShader='varying vec3 vPrintPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPrintPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader='varying vec3 vPrintPosition;\nuniform float uFrequency;\nuniform float uRelief;\nuniform vec3 uPrintAxis;\nuniform vec3 uPrintOrigin;\nuniform float uPrintScale;\nuniform float uSliceHeight;\nuniform float uSliceActive;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float printHeight = dot(vPrintPosition - uPrintOrigin, uPrintAxis) / max(uPrintScale, .001);
        float phase = printHeight * uFrequency;
        float height = sin(phase) * uRelief * exp(-fwidth(phase) * 1.1);
        vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
        vec3 s0 = cross(q1, normal), s1 = cross(normal, q0);
        float det = dot(q0, s0);
        normal = normalize(abs(det)*normal-sign(det)*(dFdx(height)*s0+dFdy(height)*s1));
        float stripe = sin(phase) * .017 * exp(-fwidth(phase));
        diffuseColor.rgb *= 1.0 + stripe;
        float sliceBand = uSliceActive * exp(-pow((printHeight - uSliceHeight) / .018, 2.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.65,.84,1.0), sliceBand * .7);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(.3,.6,.9) * sliceBand;');
    };
    surface.customProgramCacheKey=()=> 'forma-material-world-v4';
    const floorMaterial=new THREE.MeshStandardMaterial({color:0x163cde,roughness:.65,metalness:.04,envMapIntensity:.15,transparent:true,opacity:.23,depthWrite:false});
    floorMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 1.0 - smoothstep(10.0, 30.0, length(vViewPosition));\n#include <opaque_fragment>')};
    floorMaterial.customProgramCacheKey=()=> 'forma-floor-fade-v1';
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-2;floor.receiveShadow=true;world.add(floor);
    const pixels=new Uint8Array(128*128*4);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;pixels[i]=3;pixels[i+1]=6;pixels[i+2]=18;pixels[i+3]=Math.round(135*Math.exp(-(((x-64)/38)**2+((y-64)/38)**2)*2))}
    const shadowMap=new THREE.DataTexture(pixels,128,128);shadowMap.needsUpdate=true;shadowMap.magFilter=THREE.LinearFilter;
    const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false});
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(6,4.8),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.98;world.add(shadow);
    // A single continuous strand is our environmental motif: filament, not a stock CGI prop.
    const strandPoints=Array.from({length:110},(_,i)=>{const t=i/109*Math.PI*5;return new THREE.Vector3(Math.cos(t)*1.2,(i/109-.5)*1.65,Math.sin(t)*1.2)});
    const strandGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandPoints),200,.052,8,false);
    const strandMaterial=new THREE.MeshPhysicalMaterial({color:0xe34c2c,roughness:.38,metalness:0,clearcoat:.14});
    const strand=new THREE.Mesh(strandGeometry,strandMaterial);strand.position.set(-3.8,-1.1,-.5);strand.rotation.z=-.45;strand.castShadow=true;world.add(strand);
    const measure=new THREE.Group();world.add(measure);
    let measureKey='';
    const pointer=new THREE.Vector2(),pointerGoal=new THREE.Vector2(),rotationGoal=new THREE.Euler(.07,-.35,-.11),positionGoal=new THREE.Vector3(.9,-.1,0);
    let scaleGoal=1,orbitX=0,orbitY=0,zoom=1;
    function quality(){element!.dataset.renderTier=['LOW','MEDIUM','HIGH'][tier];renderer.setPixelRatio(Math.min(devicePixelRatio||1,[1,1.35,1.8][tier]));renderer.shadowMap.enabled=tier>0;key.shadow.mapSize.set(tier===2?1024:512,tier===2?1024:512);if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null}}
    function requestFrame(){if(!frame&&!disposed&&document.visibilityState!=='hidden')frame=requestAnimationFrame(tick)}
    function fitShot(){
      const scene=stateRef.current,mobile=innerWidth<760,rtl=scene.rtl??document.documentElement.dir==='rtl',sign=rtl?-1:1;
      const shot=scene.shot;rotationGoal.set(.07,-.35,-.11);positionGoal.set(.9*sign,-.1,0);scaleGoal=1;
      cameraGoal.set(3.1,1.9,7.8);lookGoal.set(0,0,0);
      if(shot==='hero'){cameraGoal.set(2.4,1.4,mobile?11.6:8.8);positionGoal.set(mobile?.9*sign:1.6*sign,mobile?-.9:-.1,0);rotationGoal.z=-.19;scaleGoal=mobile?1:1.04}
      if(shot==='macro'){cameraGoal.set(mobile?1.2:1.8,.5,mobile?9.2:6.2);lookGoal.set(0,.35,0);positionGoal.set((mobile?2.1:2.35)*sign,0,0);scaleGoal=1.9;rotationGoal.z=.3;rotationGoal.y=.5}
      if(shot==='archive'){
        const index=scene.index??0;positionGoal.set(mobile?.25*sign:(index%2===0?-.95:.85)*sign,mobile?-.18:.05,0);cameraGoal.set(index%2===0?2.5:-2.1,scene.kind==='tray'?5:1.6,mobile?12:7.9);rotationGoal.z=index%3===0?-.18:.12;scaleGoal=scene.kind==='tray'?1.3:1.08;
      }
      if(shot==='product'||shot==='tracking'||shot==='receipt'){
        positionGoal.set(mobile?0:.38*sign,mobile?.22:.16,0);cameraGoal.set(2.5,scene.kind==='tray'?5:1.9,mobile?9.5:8.4);rotationGoal.z=-.06;scaleGoal=mobile?.91:1.04;
        if(shot==='receipt'){positionGoal.set((mobile?1.25:1.2)*sign,mobile?.82:.16,0);cameraGoal.z=mobile?11.6:7.8;scaleGoal=mobile?.8:1.04}
        if(shot==='tracking'){positionGoal.set((mobile?.4:1.7)*sign,mobile?.72:.16,0);cameraGoal.z=mobile?11.8:8.4;scaleGoal=mobile?.73:1.0}
      }
      if(shot==='lab'){positionGoal.set(.9*sign,-.1,0);cameraGoal.set(2.8,1.9,8.1);scaleGoal=0}
      if(shot==='invitation'){positionGoal.set(1.2*sign,0,0);cameraGoal.set(3.5,2.5,8);scaleGoal=1;rotationGoal.z=.1}
      if(shot==='local'){positionGoal.set(mobile?1.2:2.4*sign,-.8,0);cameraGoal.set(3,2.4,8.8);scaleGoal=.75}
      if(scene.measurements){rotationGoal.z=0;cameraGoal.y=1.7}
      if(shot==='hidden')scaleGoal=0;
      scaleGoal*=THREE.MathUtils.clamp(Math.pow(scene.size??1,.3),.7,1.12);
      const bounds=localBounds;
      if(bounds&&['product','tracking','receipt'].includes(shot)){
        cameraGoal.copy(frameWorldObject(cameraGoal,lookGoal,bounds,positionGoal,rotationGoal,scaleGoal,camera.aspect,camera.fov));
      }
      floor.visible=!['macro','lab','hidden'].includes(shot);strand.visible=['hero','lab','invitation','local'].includes(shot)&&!(shot==='hero'&&mobile);
      strand.scale.setScalar(shot==='lab'?(scene.drag?1.45:1):shot==='local'?1.6:shot==='hero'?.42:.72);strand.position.set(shot==='lab'?0:mobile?-2.1:-3.8,shot==='lab'?-.25:-1.5,shot==='lab'?0:-.6);
      strandMaterial.color.set(shot==='lab'?(scene.drag?'#efeee5':'#3b53a9'):'#e34c2c');strandMaterial.wireframe=shot==='lab'&&!scene.drag;
      strandMaterial.roughness=shot==='lab'?.48:.38;
      floorMaterial.color.set(scene.tone==='cobalt'?'#1235c4':scene.tone==='heat'?'#b53822':scene.tone==='paper'?'#e1dfd3':'#111723');
      key.intensity=scene.tone==='ink'?2.5:2;rim.color.set(scene.tone==='ink'?'#678cff':'#dbe8ff');rim.intensity=scene.tone==='ink'?2.7:2.1;
      transitionAt=performance.now();requestFrame();
    }
    function updateMeasurements(){
      const scene=stateRef.current;const nextKey=`${sourceKey}/${scene.measurements}/${scene.size}`;
      if(measureKey===nextKey)return;measureKey=nextKey;for(const node of [...measure.children]){measure.remove(node);disposeTree(node)}
      if(!scene.measurements||!root)return;
      const bounds=localBounds;if(!bounds)return;const x=bounds.max.x+.26,y0=bounds.min.y,y1=bounds.max.y,z=bounds.max.z+.04;
      const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y0,z),new THREE.Vector3(x,y1,z),new THREE.Vector3(x-.09,y0,z),new THREE.Vector3(x+.09,y0,z),new THREE.Vector3(x-.09,y1,z),new THREE.Vector3(x+.09,y1,z)]),new THREE.LineBasicMaterial({color:scene.tone==='paper'?0x252c44:0xdfe7ff,transparent:true,opacity:.65}));measure.add(line);measure.position.copy(positionGoal);measure.rotation.y=rotationGoal.y;measure.scale.setScalar(scaleGoal);
    }
    function updateAppearance(){
      const scene=stateRef.current,response=physicalResponse(scene.material??'pla',scene.finishing??'none');
      surface.color.set(scene.color??'#efeee5');surface.roughness=response.roughness;surface.clearcoat=response.clearcoat;
      if(surface.transmission!==response.transmission){surface.transmission=response.transmission;surface.needsUpdate=true}surface.ior=response.ior;surface.thickness=.12;
      structureSurface.color.set(scene.color??'#b9cdee').lerp(new THREE.Color('#efeee5'),.4);
      setStructure(!!scene.wireframe||scene.stage==='pending');
      const layer=scene.layerHeight??({fast:.28,standard:.2,smooth:.16,detail:.12} as Record<string,number>)[scene.quality??'standard']??.2;
      printFrequency.value=Math.PI*2*(scene.heightMM??physicalHeight)*(scene.size??1)/normalizedHeight/layer;relief.value=scene.shot==='macro'?.0008:scene.finishing==='sanded'?.000012:.000045;
      updateMeasurements();requestFrame();
    }
    function setStructure(enabled:boolean){
      if(!root)return;
      const pending=!revealAt&&(stateRef.current.stage==='pending'||stateRef.current.shot==='invitation');
      if(pending&&!pendingEdges){
        pendingEdges=new THREE.Group();root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
        const lineMaterial=new THREE.LineBasicMaterial({color:structureSurface.color,transparent:true,opacity:.82});
        // Show the model's silhouette and genuine hard edges. Dense STL
        // tessellation otherwise turns a pending print into an opaque wire blob.
        root.traverse(node=>{if(node instanceof THREE.Mesh){const geometry=new THREE.EdgesGeometry(node.geometry,18);geometry.applyMatrix4(inverse.clone().multiply(node.matrixWorld));pendingEdges!.add(new THREE.LineSegments(geometry,lineMaterial))}});
        root.add(pendingEdges);
      }
      root.traverse(node=>{if(node instanceof THREE.Mesh){node.visible=!pending;node.material=enabled?structureSurface:surface}});
      if(pendingEdges){pendingEdges.visible=pending;pendingEdges.traverse(node=>{if(node instanceof THREE.LineSegments)(node.material as THREE.LineBasicMaterial).color.copy(structureSurface.color)})}
    }
    async function loadObject(){
      const scene=stateRef.current;
      const key=scene.file?`file:${scene.file.name}:${scene.file.size}:${scene.file.lastModified}`:scene.modelUrl??`catalog:${scene.kind??'vase'}`;
      if(sourceKey===key)return;sourceKey=key;const generation=++loadGeneration;
      onReady(false);let object:THREE.Object3D;
      try{
        if(scene.file||scene.modelUrl){
          let file=scene.file;
          if(!file){const response=await fetch(scene.modelUrl!);if(!response.ok)throw new Error('The model could not be opened. Try again.');const extension=/\.3mf/i.test(response.headers.get('content-disposition')??'')?'.3mf':'.stl';file=new File([await response.blob()],'model'+extension)}
          const parsed=await parseModel(file);object=parsed.object;object.rotation.x=-Math.PI/2;scene.onStats?.(parsed.stats);physicalHeight=parsed.stats.dimensions[2];
        }else{
          try{const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/'+(scene.kind??'vase')+'.glb');object=gltf.scene}catch{object=new THREE.Mesh(createProductGeometry(scene.kind??'vase',true),surface)}
          physicalHeight=160;
        }
        if(disposed||generation!==loadGeneration){disposeTree(object,surface);return}
        object.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(object),dimensions=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),normalize=3.8/Math.max(dimensions.x,dimensions.y,dimensions.z);
        object.position.sub(center);object.scale.multiplyScalar(normalize);object.position.multiplyScalar(normalize);normalizedHeight=dimensions.y*normalize;object.updateMatrixWorld(true);localBounds=new THREE.Box3().setFromObject(object);
        const oldMaterials=new Set<THREE.Material>();object.traverse(node=>{if(node instanceof THREE.Mesh){for(const previous of Array.isArray(node.material)?node.material:[node.material])if(previous!==surface)oldMaterials.add(previous);node.material=surface;node.castShadow=true;node.receiveShadow=true}});oldMaterials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose()});
        if(root){world.remove(root);disposeTree(root,[surface,structureSurface])}if(points){world.remove(points);disposeTree(points);points=null}if(construction){world.remove(construction);disposeTree(construction);construction=null}
        pendingEdges=null;root=new THREE.Group();root.add(object);world.add(root);root.position.copy(positionGoal);root.rotation.copy(rotationGoal);root.scale.setScalar(scaleGoal);
        revealAt=scene.file&&!reduced.matches?performance.now():0;
        if(revealAt){
        const sampled:number[]=[];root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert();object.traverse(node=>{if(node instanceof THREE.Mesh){const pos=node.geometry.getAttribute('position'),step=Math.max(1,Math.ceil(pos.count/4500));const point=new THREE.Vector3();for(let i=0;i<pos.count;i+=step){point.fromBufferAttribute(pos,i).applyMatrix4(node.matrixWorld).applyMatrix4(inverseRoot);sampled.push(point.x,point.y,point.z)}}});
          const cloud=new THREE.BufferGeometry();cloud.setAttribute('position',new THREE.Float32BufferAttribute(sampled,3));points=new THREE.Points(cloud,new THREE.PointsMaterial({color:0xd7e8ff,size:.018,transparent:true,opacity:.9}));world.add(points);
          construction=new THREE.Box3Helper(localBounds.clone(),0x849fdc);world.add(construction);
        }
        measureKey='';fitShot();updateAppearance();onReady(true);onFailed(false);requestFrame();
      }catch(error){if(disposed||generation!==loadGeneration)return;sourceKey='';if(root){world.remove(root);disposeTree(root,[surface,structureSurface]);root=null}scene.onError?.(error instanceof Error?error.message:'Could not open the object.');onFailed(true);onReady(false)}
    }
    function update(){fitShot();updateAppearance();if(!['hidden','lab'].includes(stateRef.current.shot))void loadObject()}
    updateRef.current=update;
    function tick(now:number){
      frame=0;if(disposed||document.visibilityState==='hidden')return;
      const scene=stateRef.current;if(scene.shot==='hidden')return;
      const easing=reduced.matches?1:.095;let moving=now-transitionAt<1100;
      camera.position.lerp(cameraGoal.clone().multiplyScalar(zoom),easing);look.lerp(lookGoal,easing);
      pointer.lerp(pointerGoal,.09);camera.lookAt(look.x+pointer.x*.06,look.y+pointer.y*.045,look.z);
      if(root){
        measure.position.copy(root.position);measure.rotation.copy(root.rotation);measure.scale.copy(root.scale);
        root.position.lerp(positionGoal,easing);root.rotation.x=THREE.MathUtils.lerp(root.rotation.x,rotationGoal.x+orbitY+pointer.y*.022,easing);root.rotation.y=THREE.MathUtils.lerp(root.rotation.y,rotationGoal.y+orbitX+pointer.x*.048,easing);root.rotation.z=THREE.MathUtils.lerp(root.rotation.z,rotationGoal.z,easing);root.scale.lerp(new THREE.Vector3(scaleGoal,scaleGoal,scaleGoal),easing);
        printAxis.value.set(0,1,0).applyQuaternion(root.quaternion);printOrigin.value.copy(root.position);printScale.value=root.scale.x;
        const bottom=new THREE.Box3().setFromObject(root).min.y;floor.position.y=Math.min(-1.92,bottom-.045);shadow.position.set(root.position.x,floor.position.y+.013,root.position.z);shadow.scale.setScalar(Math.max(.6,scaleGoal));
        if(revealAt){
          const elapsed=now-revealAt,progress=Math.min(elapsed/1000,1);root.visible=progress>.18;setStructure(progress<.5||!!scene.wireframe);
          if(points){points.position.copy(root.position);points.rotation.copy(root.rotation);points.scale.copy(root.scale);points.visible=progress<.5;(points.material as THREE.PointsMaterial).opacity=1-progress*1.7}
          if(construction){construction.position.copy(root.position);construction.rotation.copy(root.rotation);construction.scale.copy(root.scale);construction.visible=progress<.35}
          sliceActive.value=progress>.48&&progress<.9?1:0;sliceHeight.value=THREE.MathUtils.lerp(localBounds?.min.y??-1.8,localBounds?.max.y??1.8,(progress-.48)/.42);shadowMaterial.opacity=Math.max(0,(progress-.7)/.3);moving=true;
          element!.dataset.materialization=progress<.18?'vertices':progress<.5?'wireframe':progress<.9?'layers':'solid';
          if(progress===1){revealAt=0;if(points){world.remove(points);disposeTree(points);points=null}if(construction){world.remove(construction);disposeTree(construction);construction=null}updateAppearance();sliceActive.value=0;shadowMaterial.opacity=1}
        }else{root.visible=scaleGoal>0;shadowMaterial.opacity=1;sliceActive.value=scene.analyzing||['reviewed','queued','printing','finishing'].includes(scene.stage??'')?1:0;if(sliceActive.value){sliceHeight.value=THREE.MathUtils.lerp(localBounds?.min.y??-1.8,localBounds?.max.y??1.8,(Math.sin(now*.0017)+1)/2);moving=true}}
      }
      if(scene.shot==='lab'&&scene.drag){strand.rotation.y=THREE.MathUtils.lerp(strand.rotation.y,.35,.1)}
      if(pointer.distanceTo(pointerGoal)>.001||camera.position.distanceTo(cameraGoal.clone().multiplyScalar(zoom))>.003)moving=true;
      const started=performance.now();renderer.render(world,camera);if(performance.now()-started>35&&tier>0){if(++slowFrames>5){tier--;quality();resize();slowFrames=0}}
      if(moving&&!reduced.matches)requestFrame();
    }
    function resize(){const width=element!.clientWidth,height=element!.clientHeight;if(width<=0||height<=0)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fitShot()}
    const observer=new ResizeObserver(resize);observer.observe(element);quality();resize();
    const move=(event:PointerEvent)=>{if(reduced.matches||event.pointerType==='touch'||interacting)return;pointerGoal.set((event.clientX/innerWidth-.5)*2,-(event.clientY/innerHeight-.5)*2);requestFrame()};
    const leave=()=>{pointerGoal.set(0,0);requestFrame()};
    // Hit-free DOM HUD; pointer input on the stage drives the real object.
    let down:{x:number;y:number;id:number}|null=null;
    const start=(event:PointerEvent)=>{if(!(event.target instanceof Element)||event.target.closest('button,a,input,select,textarea,[role=tab],label,summary,[data-hud]'))return;if(!['product','archive','hero','tracking'].includes(stateRef.current.shot))return;down={x:event.clientX,y:event.clientY,id:event.pointerId};interacting=true;};
    const drag=(event:PointerEvent)=>{if(!down)return;const dx=event.clientX-down.x,dy=event.clientY-down.y;if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)*1.3){down=null;interacting=false;return}orbitX+=dx*.004;orbitY=THREE.MathUtils.clamp(orbitY+dy*.002,-.6,.6);down.x=event.clientX;down.y=event.clientY;transitionAt=performance.now();requestFrame()};
    const end=()=>{down=null;interacting=false};
    window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointermove',drag,{passive:true});window.addEventListener('pointerdown',start,{passive:true});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',end);document.addEventListener('pointerleave',leave);
    const visibility=()=>{if(document.visibilityState==='hidden'){cancelAnimationFrame(frame);frame=0}else{transitionAt=performance.now();requestFrame()}};document.addEventListener('visibilitychange',visibility);
    const motion=()=>{if(reduced.matches){revealAt=0;pointer.set(0,0);pointerGoal.set(0,0);if(points){world.remove(points);disposeTree(points);points=null}if(construction){world.remove(construction);disposeTree(construction);construction=null}element!.dataset.materialization='solid';shadowMaterial.opacity=1;setStructure(!!stateRef.current.wireframe||stateRef.current.stage==='pending')}fitShot()};reduced.addEventListener('change',motion);
    const lost=(event:Event)=>{event.preventDefault();onFailed(true);onReady(false);cancelAnimationFrame(frame)};renderer.domElement.addEventListener('webglcontextlost',lost);
    commandRef.current=command=>{
      if(command==='reset'){orbitX=0;orbitY=0;zoom=1}
      if(command==='left')orbitX-=Math.PI/8;if(command==='right')orbitX+=Math.PI/8;
      if(command==='in')zoom=Math.max(.55,zoom*.88);if(command==='out')zoom=Math.min(1.9,zoom*1.14);
      if(command==='top'){orbitY=.9;orbitX=0}if(command==='front'){orbitY=-rotationGoal.x;orbitX=-rotationGoal.y}if(command==='side'){orbitY=0;orbitX=Math.PI/2}
      transitionAt=performance.now();requestFrame();
    };
    update();
    return()=>{
      disposed=true;loadGeneration++;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      window.removeEventListener('pointermove',move);window.removeEventListener('pointermove',drag);window.removeEventListener('pointerdown',start);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('blur',end);document.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);renderer.domElement.removeEventListener('webglcontextlost',lost);
      disposeTree(world,[surface,structureSurface]);surface.dispose();structureSurface.dispose();key.shadow.dispose();environment.dispose();shadowMap.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();commandRef.current=null;updateRef.current=null;
    };
  },[commandRef,onReady,onFailed]);
  return <div className={`world-canvas ${state.shot==='hidden'?'world-canvas-hidden':''}`} ref={host} aria-hidden="true"/>;
}
