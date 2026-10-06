'use client';
import {useState} from 'react';
import {qualityOptions} from '@/lib/catalog';
export default function ProfileEditor({profiles,onSave,ar}:{profiles:typeof qualityOptions;onSave:(profiles:typeof qualityOptions)=>Promise<void>;ar:boolean}){
 const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 return <form className="profile-editor" aria-busy={busy} onSubmit={async e=>{
  e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);
  try{await onSave(profiles.map(q=>({...q,name:String(f.get(q.id+'-name')),ar:String(f.get(q.id+'-ar')),layer:Number(f.get(q.id+'-layer')),multiplier:Number(f.get(q.id+'-multiplier'))})))}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }}>
  <div className="profile-editor-head" aria-hidden="true"><span>{ar?'الاسم':'Name'}</span><span>العربية</span><span>{ar?'ارتفاع الطبقة · مم':'Layer height · mm'}</span><span>{ar?'معامل السعر':'Price multiplier'}</span></div>
  {profiles.map(q=><div key={q.id}>
   <input name={q.id+'-name'} aria-label={q.id+' name'} placeholder={ar?'الاسم':'Name'} defaultValue={q.name} required autoComplete="off" spellCheck={false}/>
   <input name={q.id+'-ar'} aria-label={q.id+' Arabic name'} placeholder="الاسم بالعربية" defaultValue={q.ar} required dir="rtl" autoComplete="off" spellCheck={false}/>
   <input name={q.id+'-layer'} aria-label={q.id+' layer height'} placeholder="0.20" type="number" inputMode="decimal" min=".1" max=".32" step=".01" defaultValue={q.layer} required/>
   <input name={q.id+'-multiplier'} aria-label={q.id+' price multiplier'} placeholder="1.00" type="number" inputMode="decimal" min=".3" max="5" step=".05" defaultValue={q.multiplier} required/>
  </div>)}
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <button className="primary-button" disabled={busy}>{ar?'حفظ الإعدادات':'Save profiles'}</button>
 </form>;
}
