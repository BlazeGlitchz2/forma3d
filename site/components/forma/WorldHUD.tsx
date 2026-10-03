'use client';
import {RotateCcw,Plus,Minus,ArrowLeft,ArrowRight,Move3d} from 'lucide-react';
import {useMaterialWorld,type WorldCommand} from './MaterialWorld';

export function WorldControls({ar,wireframe,onWireframe}:{ar:boolean;wireframe?:boolean;onWireframe?:(value:boolean)=>void}){
  const {command,failed}=useMaterialWorld();const t=(en:string,arabic:string)=>ar?arabic:en;
  const key=(event:React.KeyboardEvent)=>{const actions:Record<string,WorldCommand>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'top',ArrowDown:'front','+':'in','=':'in','-':'out',Home:'reset'};if(actions[event.key]){event.preventDefault();command(actions[event.key])}};
  return <div className="world-viewer-hud" data-hud>
    <div className="world-keyboard-target" tabIndex={0} role="group" aria-label={t('3D object controls. Arrow keys rotate. Plus and minus zoom. Home resets.','تحكم بالقطعة. الأسهم للتدوير، زائد وناقص للتكبير، ومفتاح البداية لإعادة العرض.')} onKeyDown={key}>
      <button type="button" aria-label={t('Rotate left','تدوير لليسار')} onClick={()=>command('left')}><ArrowLeft size={16}/></button>
      <button type="button" aria-label={t('Rotate right','تدوير لليمين')} onClick={()=>command('right')}><ArrowRight size={16}/></button>
      <button type="button" aria-label={t('Zoom in','تكبير')} onClick={()=>command('in')}><Plus size={16}/></button>
      <button type="button" aria-label={t('Zoom out','تصغير')} onClick={()=>command('out')}><Minus size={16}/></button>
      <button type="button" aria-label={t('Reset view','إعادة العرض')} onClick={()=>command('reset')}><RotateCcw size={16}/></button>
      <details><summary aria-label={t('Camera views','زوايا العرض')}><Move3d size={16}/></summary><div className="world-view-menu">{(['front','side','top'] as const).map(view=><button key={view} type="button" onClick={(e)=>{command(view);const d=e.currentTarget.closest('details');if(d)d.open=false;}}>{t(view,{front:'أمام',side:'جانب',top:'أعلى'}[view])}</button>)}</div></details>
    </div>
    {onWireframe&&<button className="world-structure" type="button" aria-pressed={wireframe} onClick={()=>onWireframe(!wireframe)}>{wireframe?t('Solid','مصمت'):t('Structure','البنية')}</button>}
    {failed&&<span role="status" className="world-fallback-message">{t('3D is unavailable on this device. Print options still work.','العرض ثلاثي الأبعاد غير متاح. خيارات الطباعة متاحة.')}</span>}
  </div>;
}
