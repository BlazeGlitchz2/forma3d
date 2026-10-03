import {mkdir,writeFile} from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
import * as THREE from 'three';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import {createProductGeometry} from '../lib/geometry.ts';

const directory='../output/playwright/fixtures';
await mkdir(directory,{recursive:true});
const geometry=createProductGeometry('vase',true),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
mesh.scale.setScalar(100);mesh.rotation.x=Math.PI/2;mesh.updateMatrixWorld(true);
const stl=new STLExporter().parse(mesh,{binary:true});
await writeFile(directory+'/printed-form.stl',Buffer.from(stl.buffer));
geometry.dispose();mesh.material.dispose();
const vertices=[[0,0,0],[40,0,0],[0,40,0],[0,0,40]],faces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const model=`<?xml version="1.0"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${vertices.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${faces.map(f=>`<triangle v1="${f[0]}" v2="${f[1]}" v3="${f[2]}"/>`).join('')}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
const bytes=zipSync({
 '3D/3dmodel.model':strToU8(model),
 '_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
 '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
});
await writeFile(directory+'/tetrahedron.3mf',bytes);
await writeFile(directory+'/invalid.stl','solid invalid');
console.log('FORMA_WORLD_FIXTURES_READY');
