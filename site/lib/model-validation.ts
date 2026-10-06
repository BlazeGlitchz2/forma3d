import {unzipSync,strFromU8} from 'fflate';
import type {Stats} from './pricing.ts';
import {MAX_FILE_BYTES,MAX_FILE_LABEL,MAX_3MF_UNCOMPRESSED_BYTES,MAX_3MF_UNCOMPRESSED_LABEL,MAX_TRIANGLES,MAX_3MF_OBJECT_TRIANGLES,MAX_3MF_VERTICES} from './upload-limits.ts';
export {MAX_FILE_BYTES} from './upload-limits.ts';
export function validateModel(bytes:Uint8Array,filename:string):Stats{
 if(!bytes.length||bytes.length>MAX_FILE_BYTES)throw new Error('Choose a model smaller than '+MAX_FILE_LABEL+'.');
 if(/\.stl$/i.test(filename))return stlStats(bytes);
 if(/\.3mf$/i.test(filename))return threeMFStats(bytes);
 throw new Error('Choose an STL or 3MF file.');
}
type Vec=[number,number,number];
function measure(triangles:Iterable<Vec[]>):Stats{
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let volume=0;
 let count=0;
 for(const [a,b,c] of triangles){if(++count>MAX_TRIANGLES)throw new Error('Use fewer than 2 million triangles.');for(const p of [a,b,c])for(let i=0;i<3;i++){if(!Number.isFinite(p[i])||Math.abs(p[i])>100000)throw new Error('This model contains invalid geometry.');min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}
 if(!count)throw new Error('This model has no geometry.');const dimensions=max.map((v,i)=>v-min[i]) as Vec;if(dimensions.some(d=>d<=0)||Math.abs(volume)<.001)throw new Error('This model has no printable volume. Export a closed solid and try again.');return{dimensions,volume:Math.abs(volume),triangles:count};
}
function stlStats(bytes:Uint8Array):Stats{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const count=bytes.length>=84?view.getUint32(80,true):0;
 if(count>0&&84+count*50===bytes.length){function* faces(){for(let i=0;i<count;i++){const offset=84+i*50+12;yield [0,1,2].map(j=>[view.getFloat32(offset+j*12,true),view.getFloat32(offset+j*12+4,true),view.getFloat32(offset+j*12+8,true)] as Vec);}}return measure(faces());}
 const text=new TextDecoder().decode(bytes);if(!/^\s*solid\b/i.test(text)||!text.includes('endsolid'))throw new Error('This STL is incomplete or corrupt. Export it again.');function* faces(){const regex=/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;let tri:Vec[]=[];for(const match of text.matchAll(regex)){tri.push([Number(match[1]),Number(match[2]),Number(match[3])]);if(tri.length===3){yield tri;tri=[];}}if(tri.length)throw new Error('This STL contains incomplete triangles.');}return measure(faces());
}
function attrs(tag:string):Record<string,string>{const result:Record<string,string>={};for(const m of tag.matchAll(/([\w:]+)\s*=\s*["']([^"']*)["']/g))result[m[1]]=m[2];return result;}
function threeMFStats(bytes:Uint8Array):Stats{
 // Filter before decompression to bound Worker memory; reject external assembly parts.
 let modelCount=0;const files=unzipSync(bytes,{filter:f=>{if(!/\.model$/i.test(f.name))return false;if(++modelCount>1||f.originalSize>MAX_3MF_UNCOMPRESSED_BYTES)throw new Error('Export a single-part 3MF under '+MAX_3MF_UNCOMPRESSED_LABEL+' uncompressed, or use STL.');return true;}});const models=Object.entries(files);if(models.length!==1)throw new Error('Export a single-part 3MF, or use STL for this assembly.');
 const xml=strFromU8(models[0][1]);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('This 3MF contains unsupported XML.');const header=xml.match(/<model\b([^>]*)>/);const unit=attrs(header?.[1]??'').unit??'millimeter';const factor:Record<string,number>={micron:.001,millimeter:1,centimeter:10,inch:25.4,foot:304.8,meter:1000};const multiplier=factor[unit];if(!multiplier)throw new Error('Unsupported 3MF units.');
 const objects=new Map<string,{triangles:Vec[][];components:{id:string;transform?:string}[]}>();for(const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)){const id=attrs(m[1]).id;if(!id)continue;const vertices:Vec[]=[];for(const v of m[2].matchAll(/<vertex\b([^>]*)\/?\s*>/g)){const a=attrs(v[1]);if(vertices.length>=MAX_3MF_VERTICES)throw new Error('This model has too many vertices.');vertices.push([Number(a.x),Number(a.y),Number(a.z)]);}const triangles:Vec[][]=[];for(const tri of m[2].matchAll(/<triangle\b([^>]*)\/?\s*>/g)){const a=attrs(tri[1]);const triangle=[vertices[Number(a.v1)],vertices[Number(a.v2)],vertices[Number(a.v3)]];if(triangle.some(v=>!v))throw new Error('This 3MF references missing vertices.');if(triangles.length>=MAX_3MF_OBJECT_TRIANGLES)throw new Error('This 3MF part has too many triangles; export it as STL.');triangles.push(triangle);}const components=[...m[2].matchAll(/<component\b([^>]*)\/?\s*>/g)].map(c=>{const a=attrs(c[1]);if(a['p:path'])throw new Error('Export this assembly as STL.');return{id:a.objectid,transform:a.transform}});objects.set(id,{triangles,components});}
 function transform(v:Vec,text?:string):Vec{if(!text)return [...v];const n=text.trim().split(/\s+/).map(Number);if(n.length!==12||n.some(v=>!Number.isFinite(v)))throw new Error('Invalid 3MF transform.');return[v[0]*n[0]+v[1]*n[3]+v[2]*n[6]+n[9],v[0]*n[1]+v[1]*n[4]+v[2]*n[7]+n[10],v[0]*n[2]+v[1]*n[5]+v[2]*n[8]+n[11]];}
 let expanded=0;function* emit(id:string,transforms:(string|undefined)[],stack:string[]=[]):Generator<Vec[]>{if(stack.length>10||stack.includes(id))throw new Error('This 3MF assembly is too complex.');const o=objects.get(id);if(!o)throw new Error('This 3MF contains a missing part.');for(const tri of o.triangles){if(++expanded>MAX_TRIANGLES)throw new Error('Use fewer than 2 million triangles.');yield tri.map(v=>{let p=v;for(const tr of transforms)p=transform(p,tr);return p.map(n=>n*multiplier) as Vec});}if(o.components.length>1000)throw new Error('This 3MF assembly has too many parts.');for(const c of o.components)yield* emit(c.id,[c.transform,...transforms],[...stack,id]);}
 const build=xml.match(/<build\b[^>]*>([\s\S]*?)<\/build>/)?.[1];if(!build)throw new Error('This 3MF has no build items.');function* faces(){for(const m of build!.matchAll(/<item\b([^>]*)\/?\s*>/g)){const a=attrs(m[1]);yield* emit(a.objectid,[a.transform]);}}return measure(faces());
}
