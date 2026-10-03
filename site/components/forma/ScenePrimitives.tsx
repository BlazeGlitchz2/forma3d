'use client';
import {lazy,Suspense,type CSSProperties} from 'react';
import {PageLink} from './PageLink';
import type {Product} from '@/lib/catalog';
const ModelViewport=lazy(()=>import('./ModelViewport'));
export function DirectionArrow({diagonal=false}:{diagonal?:boolean}){return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={diagonal?'M5 19 19 5M5 5h14v14':'M3 12h17m-7-7 7 7-7 7'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/></svg>}
export function ObjectLoader(){return <div className="object-loader" role="status"><span/><span/><span/><span/><span/><span className="sr-only">Preparing the object</span></div>}
export function ProductObject({product,color,ar,index=0}:{product:Product;color:string;ar:boolean;index?:number}){
  const indexStr = String(index + 1).padStart(2, '0');
  return <PageLink className={`parade-object parade-object-${index}`} href={'/make?product='+product.id} aria-label={(ar?'خصّص ':'Customize ')+(ar?product.nameAr:product.name)}>
    <span className="parade-index" aria-hidden="true">{indexStr}</span>
    <div className="parade-preview" style={{viewTransitionName:'object-'+product.id} as CSSProperties}>
      <Suspense fallback={<ObjectLoader/>}><ModelViewport compact kind={product.kind} modelUrl={product.modelId?'/api/uploads/'+product.modelId:undefined} color={color} ar={ar}/></Suspense>
      <span className="object-open"><DirectionArrow diagonal/></span>
    </div>
    <div className="parade-meta">
      <div>
        <h3>{ar?product.nameAr:product.name}</h3>
        <span className="parade-category">{ar?({Room:'للغرفة','Desk setup':'للمكتب',Useful:'أغراض عملية'} as Record<string,string>)[product.category]??product.category:product.category} · PLA</span>
      </div>
      <span className="parade-price" dir="ltr">{product.price} <small>SAR</small></span>
    </div>
  </PageLink>;
}
