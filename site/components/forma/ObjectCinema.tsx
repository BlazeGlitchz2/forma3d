'use client';
import {useRef,useState} from 'react';
import {PageLink as Link} from './PageLink';
import type {Shared} from './Flows';
import {useWorldShot,type WorldScene} from './MaterialWorld';
import {DirectionArrow} from './ScenePrimitives';
import {WorldControls} from './WorldHUD';

export default function ObjectCinema({ar,products,materials,palette}:Shared){
 const t=(en:string,arabic:string)=>ar?arabic:en;
 const hero=products.find(p=>p.available&&p.kind==='vase')??products.find(p=>p.available);
 const arrival=useRef<HTMLElement>(null),macro=useRef<HTMLElement>(null),invitation=useRef<HTMLElement>(null),local=useRef<HTMLElement>(null);
 const [color,setColor]=useState('white'),[quality,setQuality]=useState('smooth');
 const material=materials.find(m=>m.available);const swatches=palette.filter(c=>material?.colors.includes(c.id));
 const chosen=swatches.find(c=>c.id===color)??swatches[0];
 const source=hero?.modelId?'/api/uploads/'+hero.modelId:undefined;
 const heroKind=hero?.kind??'vase',whiteHex=palette.find(c=>c.id==='blue')?.hex??'#326bbb';
 const opening:WorldScene={shot:'hero',tone:'cobalt',rtl:ar,kind:heroKind,modelUrl:source,color:whiteHex,material:material?.id,quality:'smooth',heightMM:hero?.dimensions[2]};
 const close:WorldScene={shot:'macro',tone:'paper',rtl:ar,kind:heroKind,modelUrl:source,color:chosen?.hex??'#326bbb',material:material?.name,quality,heightMM:hero?.dimensions[2]};
 const file:WorldScene={shot:'invitation',tone:'ink',rtl:ar,kind:'stand',color:'#c9d4e6',wireframe:true};
 const place:WorldScene={shot:'local',tone:'paper',rtl:ar,kind:'vase',color:'#163cde',quality:'smooth'};
 useWorldShot(arrival,opening);useWorldShot(macro,close);useWorldShot(invitation,file);useWorldShot(local,place);
 return <div className="world-home">
  <section className="world-shot world-arrival" ref={arrival} aria-labelledby="world-arrival-title">
   <div className="world-shot-top hud"><span>{t('A digital material lab','مختبر المواد الرقمية')}</span><span>{t('Geometry → physical objects','هندسة رقمية ← قطع ملموسة')}</span></div>
   <h1 id="world-arrival-title" className="world-display world-hero-type">{ar?<><span>للأفكار</span><span>وزن.</span></>:<><span>IDEAS</span><span>HAVE</span><span>WEIGHT.</span></>}</h1>
   <div className="world-object-tag hud"><span>OBJ / 001</span><strong>{t('RIPPLE','ريبل')}</strong><span>{t('PLA / 0.16 MM','PLA / ٠٫١٦ مم')}</span><span>{t('Printed in Jubail','نطبعها في الجبيل')}</span></div>
   <div className="world-arrival-note hud"><span className="world-status-dot"/><p>{t('From a file on your screen.','من ملف على شاشتك.')}<br/>{t('To a thing in your hands.','إلى قطعة بين يديك.')}</p></div>
   <div className="world-arrival-actions hud"><Link href="/lab" className="world-action world-action-main">{t('Enter the lab','ادخل المختبر')}<DirectionArrow/></Link><Link href="/objects" className="world-action">{t('Explore objects','اكتشف القطع')}<DirectionArrow diagonal/></Link></div>
   <div className="world-shot-bottom hud"><a href="#surface" className="world-scroll">{t('Get closer','اقترب')}<span>↓</span></a><span>27° 00′ N / 49° 39′ E</span><span>{t('JUBAIL / SA','الجبيل / السعودية')}</span></div>
   <div className="world-hero-tools"><WorldControls ar={ar}/></div>
  </section>
  <section id="surface" className="world-shot world-macro" ref={macro} aria-labelledby="surface-title">
   <div className="world-shot-top hud"><span>{t('A surface you can feel','ملمس تشعر به')}</span><span>{quality==='fast'?'0.28 MM':'0.16 MM'}</span></div>
   <h2 id="surface-title" className="world-display world-macro-type">{t('LAYER','طبقة')}<br/>{t('BY LAYER.','فوق طبقة.')}</h2>
   <div className="world-macro-note hud"><span className="technical-label">FDM / {material?.name??'PLA'}</span><p>{t('A thousand small lines.','ألف خط صغير.')}<br/>{t('One real thing.','قطعة حقيقية واحدة.')}</p></div>
   <div className="world-material-controls hud"><div className="world-surface-modes"><button aria-pressed={quality==='smooth'} onClick={()=>setQuality('smooth')}>{t('Smooth','ناعم')}<small>0.16</small></button><button aria-pressed={quality==='fast'} onClick={()=>setQuality('fast')}>{t('Textured','ملمس واضح')}<small>0.28</small></button></div><div className="world-color-row">{swatches.map(c=><button key={c.id} aria-label={ar?c.ar:c.name} aria-pressed={chosen?.id===c.id} onClick={()=>setColor(c.id)} style={{background:c.hex}}/>)}<span>{ar?chosen?.ar:chosen?.name}</span></div><Link className="world-action" href={'/make?product='+(hero?.id??'ripple-vase')+'&color='+(chosen?.id??'blue')}>{t('Make it yours','اجعلها لك')}<DirectionArrow/></Link></div>
   <div className="world-shot-bottom hud"><span>{t('Material, made visible.','المادة، أمام عينيك.')}</span><span>{material?.name??'PLA'} / 1.75 MM</span></div>
  </section>
  <section className="world-shot world-invitation" ref={invitation} aria-labelledby="file-title">
   <div className="world-shot-top hud"><span>{t('Your geometry belongs here','هندستك مكانها هنا')}</span><span>STL / 3MF</span></div>
   <h2 id="file-title" className="world-display">{t('A FILE.','ملف.')}<br/>{t('A FIRST','خطوة')}<br/>{t('STEP.','أولى.')}</h2>
   <div className="world-invitation-copy hud"><p>{t('Drop your model. Choose the material.','ضع نموذجك. اختر الخامة.')}<br/>{t('We print it right here.','نطبعه هنا في الجبيل.')}</p><Link href="/lab" className="world-action world-action-main">{t('Bring your model','أحضر نموذجك')}<DirectionArrow/></Link><span>{t('Private files / up to 15 MB','ملفات خاصة / حتى ١٥ ميغابايت')}</span></div>
   <div className="world-shot-bottom hud"><span>{t('DIGITAL → PHYSICAL','رقمي ← ملموس')}</span><span>{t('No account needed','بدون حساب')}</span></div>
  </section>
  <section className="world-shot world-local" ref={local} aria-labelledby="local-title">
   <div className="world-shot-top hud"><span>{t('Short distance. Real objects.','مسافة قصيرة. قطع حقيقية.')}</span><span>{t('Local production','إنتاج محلي')}</span></div>
   <h2 id="local-title" className="world-display">{t('MADE','صُنع')}<br/>{t('IN','في')}<br/>{t('JUBAIL.','الجبيل.')}</h2>
   <div className="world-local-copy hud"><p>{t('Printed locally.','نطبعها محليًا.')}<br/>{t('Pay first. Collect locally.','ادفع أولًا. واستلم محليًا.')}</p><Link href="/lab" className="world-action">{t('Start something','ابدأ قطعة')}<DirectionArrow/></Link></div>
   <div className="world-shot-bottom hud"><span>{t('PAYMENT BEFORE PRINTING','الدفع قبل الطباعة')}</span><Link href="/about">{t('Meet the studio','عن الاستوديو')} ↗</Link></div>
  </section>
 </div>;
}
