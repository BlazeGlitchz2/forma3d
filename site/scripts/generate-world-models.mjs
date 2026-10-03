import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createProductGeometry} from '../lib/geometry.ts';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()})}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:application/octet-stream;base64,'+Buffer.from(result).toString('base64');this.onloadend?.()})}
};
await mkdir('public/models',{recursive:true});
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const kind of ['vase','planter','tray','stand','organizer','lamp']){
  const geometry=createProductGeometry(kind,true),material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6});
  // Explicit indices keep Three's wireframe generator compatible with interleaved
  // Meshopt accessors, including the originally non-indexed extruded phone stand.
  if(!geometry.index)geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));
  const bytes=await new GLTFExporter().parseAsync(new THREE.Mesh(geometry,material),{binary:true,onlyVisible:true});
  const document=await io.readBinary(new Uint8Array(bytes));
  await document.transform(meshopt({encoder:MeshoptEncoder,level:'high'}));
  const optimized=await io.writeBinary(document);
  await writeFile('public/models/'+kind+'.glb',optimized);
  console.log(kind+': '+Math.round(optimized.byteLength/1024)+' KiB');geometry.dispose();material.dispose();
}
console.log('FORMA_WORLD_MODELS_GENERATED');
