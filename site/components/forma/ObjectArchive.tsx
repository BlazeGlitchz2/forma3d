'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Search} from 'lucide-react';
import type {Product} from '@/lib/catalog';
import type {Shared} from './Flows';
import {PageLink as Link} from './PageLink';
import {useMaterialWorld,useWorldShot,type WorldScene} from './MaterialWorld';
import {DirectionArrow} from './ScenePrimitives';

function ArchiveShot({product:p,index,ar,palette}:{product:Product;index:number;ar:boolean;palette:Shared['palette']}){
  const ref=useRef<HTMLElement>(null),t=(en:string,arabic:string)=>ar?arabic:en;
  const tone=index%4===0?'cobalt':index%4===1?'paper':index%4===2?'heat':'ink';
  const color=palette.find(c=>c.id===p.color)?.hex??'#efeee5';
  const scene=useMemo<WorldScene>(()=>({shot:'archive',tone,rtl:ar,kind:p.kind,color,modelUrl:p.modelId?'/api/uploads/'+p.modelId:undefined,index,quality:'smooth',heightMM:p.dimensions[2]}),[tone,ar,p.kind,color,p.modelId,p.dimensions,index]);
  useWorldShot(ref,scene);
  const name=ar?p.nameAr:p.name.replace(/^The /,'');
  return <section ref={ref} className={`world-shot archive-shot archive-composition-${index%3}`} aria-label={name}>
    <div className="world-shot-top hud"><span>{t('OBJECT ARCHIVE','أرشيف القطع')} / {String(index+1).padStart(3,'0')}</span><span>{String(index+1).padStart(2,'0')} / {t('SCROLL TO EXPLORE','مرر للاستكشاف')}</span></div>
    <h1 className="world-display archive-type">{ar?name:name.split(' ')[0]}</h1>
    <div className="archive-object-info hud"><span className="technical-label">OBJ / {String(index+1).padStart(3,'0')}</span><h2>{name}</h2><p>{ar?p.descriptionAr:p.description}</p><div className="archive-spec"><span dir="ltr">{p.dimensions.join(' × ')} MM</span><span>{t(p.category,({'Room':'للغرفة','Useful':'عملي','Desk setup':'للمكتب'} as Record<string,string>)[p.category]??p.category)} / PLA</span></div><strong className="archive-price" dir="ltr">{p.price}<small>SAR</small></strong><Link className="world-action world-action-main" href={'/make?product='+p.id+'&color='+p.color}>{t('Enter object','ادخل القطعة')}<DirectionArrow/></Link></div>
    <div className="world-shot-bottom hud"><span>{t('DRAG TO TURN','اسحب للتدوير')}</span><span>{t('MADE TO ORDER / JUBAIL','نصنعها عند الطلب / الجبيل')}</span></div>
  </section>;
}

export default function ObjectArchive({ar,products,categories,palette,onShowGallery}:Shared&{onShowGallery?:()=>void}){
  const t=(en:string,arabic:string)=>ar?arabic:en,{setScene}=useMaterialWorld();
  const [index,setIndex]=useState(false),[category,setCategory]=useState('All'),[search,setSearch]=useState(''),[sort,setSort]=useState('curated');
  const available=products.filter(p=>p.available).sort((a,b)=>Number(b.featured)-Number(a.featured));
  const visible=available.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.nameAr} ${p.description} ${p.descriptionAr}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);
  useEffect(()=>{if(index)setScene({shot:'hidden',tone:'paper'});window.scrollTo({top:0,behavior:'instant'})},[index,setScene]);
  return <div className={`world-archive ${index?'archive-index-active':''}`}>
    <div className="archive-switch hud" data-hud>
      {onShowGallery&&<><button type="button" onClick={onShowGallery}>{t('Gallery','المعرض')}</button><span>/</span></>}
      <button type="button" aria-pressed={!index} onClick={()=>setIndex(false)}>{t('World','العالم')}</button>
      <span>/</span>
      <button type="button" aria-pressed={index} onClick={()=>setIndex(true)}>{t('Index','الفهرس')} <small>{available.length}</small></button>
    </div>
    {!index?available.map((p,i)=><ArchiveShot key={p.id} product={p} index={i} ar={ar} palette={palette}/>):<section className="world-index hud">
      <header><span className="technical-label">{t('OBJECT ARCHIVE','أرشيف القطع')}</span><h1>{t('Find your form.','اختر شكلك.')}</h1></header>
      <div className="index-tools"><label className="index-search"><Search size={17}/><input type="search" aria-label={t('Search objects','ابحث عن القطع')} placeholder={t('Search objects','ابحث عن القطع')} value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="index-category-field"><span>{t('Category','الفئة')}</span><select aria-label={t('Category','الفئة')} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{t(c,({'All':'الكل','Desk setup':'للمكتب','Room':'للغرفة','Useful':'عملي','Gifts':'هدايا','Miniatures':'مجسمات'} as Record<string,string>)[c]??c)}</option>)}</select></label><label><span>{t('Order by','الترتيب')}</span><select aria-label={t('Sort objects','ترتيب القطع')} value={sort} onChange={e=>setSort(e.target.value)}><option value="curated">{t('Studio selection','اختيارات الاستوديو')}</option><option value="low">{t('Price: low to high','السعر: الأقل أولاً')}</option><option value="high">{t('Price: high to low','السعر: الأعلى أولاً')}</option></select></label></div>
      <nav className="index-chips" aria-label={t('Object categories','فئات القطع')}>{categories.map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)}>{t(c,({'All':'الكل','Desk setup':'للمكتب','Room':'للغرفة','Useful':'عملي','Gifts':'هدايا','Miniatures':'مجسمات'} as Record<string,string>)[c]??c)}</button>)}</nav>
      <p role="status" className="index-count">{visible.length} {t('objects','قطع')}</p><div className="object-index-rows">{visible.map((p,i)=><Link className="object-index-row" key={p.id} href={'/make?product='+p.id}><span className="index-number">{String(i+1).padStart(3,'0')}</span><strong>{ar?p.nameAr:p.name}</strong><span className="index-category">{ar?({'Room':'للغرفة','Useful':'عملي','Desk setup':'للمكتب'} as Record<string,string>)[p.category]??p.category:p.category}</span><span className="index-size" dir="ltr">{p.dimensions.join(' × ')} MM</span><span className="index-price" dir="ltr">{p.price} <small>SAR</small></span><DirectionArrow diagonal/></Link>)}</div>
      {!visible.length&&<div className="index-empty"><p>{t('No object found. Try a different word.','لم نجد قطعة. جرّب كلمة أخرى.')}</p><button className="world-action" onClick={()=>{setSearch('');setCategory('All')}}>{t('Show all objects','عرض جميع القطع')}</button></div>}
      <Link href="/lab" className="world-action index-lab-link">{t('Have your own model? Enter the lab','لديك نموذج؟ ادخل المختبر')}<DirectionArrow/></Link>
    </section>}
    {!available.length&&!index&&<section className="world-index hud"><h1>{t('Your form comes first.','شكلك أولاً.')}</h1><Link href="/lab" className="world-action">{t('Upload a model','ارفع نموذجًا')}<DirectionArrow/></Link></section>}
  </div>;
}
