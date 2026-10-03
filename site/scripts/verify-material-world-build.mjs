import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(!existsSync('dist/server/index.js')||!config.d1_databases?.length||!config.r2_buckets?.length)throw new Error('Worker or private storage binding missing.');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const kind of ['vase','planter','tray','stand','organizer','lamp']){
 const path='public/models/'+kind+'.glb';if(!existsSync(path))throw new Error('Missing presentation asset: '+kind);
 const model=await io.read(path);
 for(const mesh of model.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  const position=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),indices=primitive.getIndices();
  if(!position||!normal||position.getCount()!==normal.getCount()||!indices)throw new Error('Invalid indexed presentation geometry: '+kind);
  for(const index of indices.getArray())if(index>=position.getCount())throw new Error('Presentation index exceeds vertex buffer: '+kind);
 }
}
console.log('FORMA_WORLD_BUILD_PASSED');
