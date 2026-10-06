'use client';
import {useState,useEffect,useCallback,lazy,Suspense,useRef,useMemo} from 'react';
import {PageLink as Link} from './PageLink';
import type {Mesh,Texture,Material as ThreeMaterial,BufferGeometry} from 'three';
import {Check,Plus,Minus,MapPin,Package,Clock,AlertCircle,Loader2,Download,Search,Eye,EyeOff,LogOut} from 'lucide-react';
import {useMaterialWorld,type WorldScene} from './MaterialWorld';
import {WorldControls} from './WorldHUD';
import ObjectArchive from './ObjectArchive';
import {DirectionArrow} from './ScenePrimitives';
import TrackingJourney from './TrackingJourney';
import AdminPaymentPanel from './AdminPaymentPanel';
import {CartJourney,CheckoutJourney} from './OrderJourney';
import type {OrderPayment} from '@/lib/payment';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {colors,defaultConfig,maximumPrintScale,fitsPrinter,productStats,qualityOptions,productConfig,productMaterials,type Product,type Material,type PrintConfig} from '@/lib/catalog';
import {calculateQuote,type Item,type Quote,type Stats} from '@/lib/pricing';
const SupportInbox=lazy(()=>import('./SupportInbox'));
const ProfileEditor=lazy(()=>import('./ProfileEditor'));
const CatalogEditor=lazy(()=>import('./CatalogEditor'));
const ModelViewport=lazy(()=>import('./ModelViewport'));
export type CartItem=Item&{price:number;discount?:number;colorHex:string;kind:Product['kind'];file?:File;dimensions:number[]};
export type Shared={ar:boolean;products:Product[];materials:Material[];addItem:(item:CartItem)=>void;cart:CartItem[];setCart:(v:CartItem[])=>void;categories:string[];profiles:typeof qualityOptions;slicingAvailable:boolean;palette:typeof colors;onOpenSupport?:(orderId?:string)=>void;onOpenAccount?:()=>void};
export const request=async <T,>(url:string,options?:RequestInit):Promise<T>=>{let res:Response;try{res=await fetch(url,options)}catch{throw new Error('We couldn’t reach the studio. Check your connection and try again.')}let data:T&{error?:string};try{data=await res.json()}catch{throw new Error(res.status===413?'Choose a model smaller than 15 MB.':'The studio couldn’t complete this request. Try again.')}if(!res.ok)throw new Error(data.error??'Something went wrong. Try again.');return data;};
const post=<T,>(url:string,data:unknown)=>request<T>(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const formatTime=(minutes:number)=>`${Math.floor(minutes/60)}h ${minutes%60}m`;
const formatPrice=(value:number)=>value.toLocaleString('en',{maximumFractionDigits:2});
function WorldPrice({value}:{value?:number}){const [whole,fraction]=value===undefined?['—']:formatPrice(value).split('.');const factor=Math.min(1,3/(whole.length+(fraction?1+fraction.length:0)*.4));return <strong dir="ltr" aria-live="polite" style={{'--price-factor':factor} as React.CSSProperties}><span>{whole}{fraction&&<span className="world-price-decimal">.{fraction}</span>}</span><small>SAR</small></strong>}
export function PrintOptions({ar,config,setConfig,materials,dimensions,palette=colors,sizeOptions,profiles=qualityOptions,onModeChange}:{ar:boolean;config:PrintConfig;setConfig:(v:PrintConfig)=>void;materials:Material[];dimensions:number[];palette?:typeof colors;sizeOptions?:number[];profiles?:typeof qualityOptions;onModeChange?:(mode:string)=>void}){
 const t=(en:string,arabic:string)=>ar?arabic:en;
 const [mode,setMode]=useState('color');
 const material=materials.find(m=>m.id===config.material)??materials[0],color=material?.swatches?.find(c=>c.id===config.color)??palette.find(c=>c.id===config.color)??palette[0];
 const change=(key:keyof PrintConfig,value:string|number)=>setConfig({...config,[key]:value});
 const chooseMode=(next:string)=>{setMode(next);onModeChange?.(next)};
 const maxScale=Math.min(300,maximumPrintScale(dimensions));
 const availableColors=palette.filter(c=>material?.colors.includes(c.id)).map(c=>material?.swatches?.find(s=>s.id===c.id)??c);
 const modes=[['size','Size','الحجم'],['material','Material','المادة'],['color','Color','اللون'],['quality','Quality','الجودة'],['quantity','Qty','الكمية'],['more','More','المزيد']];
 return <div className="world-options" data-hud>
  <div className="world-mode-controls" id="print-mode-panel" role="region" aria-label={t('Print settings','إعدادات الطباعة')}>
   {mode==='color'&&<div className="world-color-control"><div className="world-option-title"><span>{t('Filament','الخامة')}</span><strong>{ar?color.ar:color.name}</strong><span>{material?.name} / {t('Matte','مطفي')}</span></div><div className="world-swatches">{availableColors.map(c=><button type="button" key={c.id} aria-label={ar?c.ar:c.name} aria-pressed={config.color===c.id} onClick={()=>change('color',c.id)} style={{'--swatch':c.hex} as React.CSSProperties}>{config.color===c.id&&<Check size={15}/>}</button>)}</div></div>}
   {mode==='size'&&<div className="world-size-control"><div className="world-option-title"><span>{t('Scale','المقياس')}</span><strong dir="ltr">{config.size}%</strong><span dir="ltr">{dimensions.map(d=>Math.round(d*config.size/100)).join(' × ')} MM</span></div>{sizeOptions?.length?<div className="world-option-buttons">{sizeOptions.map(size=><button type="button" key={size} aria-pressed={config.size===size} onClick={()=>change('size',size)}>{size}%</button>)}</div>:<input type="range" className="world-scale-range" aria-label={t('Model size','حجم النموذج')} min="10" max="300" step="1" value={config.size} onChange={e=>change('size',Number(e.target.value))}/>}</div>}
   {mode==='material'&&<div><div className="world-option-title"><span>{t('Physical material','المادة الفعلية')}</span></div><div className="world-option-buttons world-material-buttons">{materials.filter(m=>m.available).map(m=><button type="button" key={m.id} aria-pressed={config.material===m.id} onClick={()=>setConfig({...config,material:m.id,color:m.colors.includes(config.color)?config.color:m.colors[0]})}><strong>{m.name}</strong><small>{ar?m.descriptionAr:m.description}</small></button>)}</div>{!materials.length&&<p role="alert">{t('No material is available for this object.','لا تتوفر مادة لهذه القطعة.')}</p>}</div>}
   {mode==='quality'&&<div><div className="world-option-title"><span>{t('Layer height','ارتفاع الطبقة')}</span></div><div className="world-option-buttons world-quality-buttons">{profiles.map(q=><button type="button" key={q.id} aria-pressed={config.quality===q.id} onClick={()=>change('quality',q.id)}>{ar?q.ar:q.name}<small dir="ltr">{q.layer.toFixed(2)} MM</small></button>)}</div></div>}
   {mode==='quantity'&&<div className="world-quantity-control"><span>{t('How many?','كم قطعة؟')}</span><div><button type="button" aria-label={t('Decrease quantity','تقليل الكمية')} disabled={config.quantity<=1} onClick={()=>change('quantity',Math.min(20,Math.max(1,config.quantity-1)))}><Minus size={17}/></button><strong aria-live="polite">{config.quantity}</strong><button type="button" aria-label={t('Increase quantity','زيادة الكمية')} disabled={config.quantity>=20} onClick={()=>change('quantity',Math.min(20,Math.max(1,config.quantity+1)))}><Plus size={17}/></button></div></div>}
   {mode==='more'&&<div className="world-more-control"><label>{t('Strength','المتانة')}<select value={config.strength} onChange={e=>change('strength',e.target.value)}>{[['light','Light','خفيف'],['everyday','Everyday','يومي'],['strong','Strong','متين'],['solid','Solid','مصمت']].map(([v,en,a])=><option key={v} value={v}>{t(en,a)}</option>)}</select></label><label>{t('Supports','الدعامات')}<select value={config.supports} onChange={e=>change('supports',e.target.value)}><option value="auto">{t('Studio decides','يحددها الاستوديو')}</option><option value="none">{t('None','بدون')}</option></select></label><label>{t('Finish','التشطيب')}<select value={config.finishing} onChange={e=>change('finishing',e.target.value)}><option value="none">{t('Natural layers','طبقات طبيعية')}</option><option value="sanded">{t('Hand sanded / +20 SAR','صنفرة / +٢٠ ريال')}</option></select></label></div>}
  </div>
  <div className="world-mode-rail" role="group" aria-label={t('Configuration modes','أوضاع التخصيص')}>{modes.map(([value,en,a])=><button type="button" key={value} aria-pressed={mode===value} aria-controls="print-mode-panel" onClick={()=>chooseMode(value)}>{t(en,a)}{mode===value&&<span aria-hidden="true">•</span>}</button>)}</div>
  {config.size>maxScale&&<div className="world-fit-error" role="alert"><span>{t('This size exceeds the printer volume.','هذا الحجم أكبر من مساحة الطباعة.')}</span><button type="button" disabled={maxScale<10} onClick={()=>{change('size',maxScale);chooseMode('size')}}>{t('Fit to printer','اضبط الحجم للطابعة')}</button></div>}
 </div>;
}
export function MakeFlow(shared:Shared){
 const{ar,products,materials,addItem,palette:colors}=shared;
 const {setScene,ready,failed}=useMaterialWorld();const [optionMode,setOptionMode]=useState('color');
 const t=(e:string,a:string)=>ar?a:e;
 const [file,setFile]=useState<File|null>(null);const [uploadId,setUploadId]=useState('');const [stats,setStats]=useState<Stats|null>(null);const [config,setConfig]=useState({...defaultConfig});const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [drag,setDrag]=useState(false);const [quote,setQuote]=useState<Quote|null>(null);const [wireframe,setWireframe]=useState(false);const [product,setProduct]=useState<Product|null>(null);const [analyzing,setAnalyzing]=useState(false);const [quoteKey,setQuoteKey]=useState('');const [viewReady,setViewReady]=useState(false); const [uploadPhase,setUploadPhase]=useState<'opening'|'uploading'|null>(null);const [pendingName,setPendingName]=useState('');const [added,setAdded]=useState(false);const addedTimer=useRef<number|undefined>(undefined);const input=useRef<HTMLInputElement>(null);
 const queryInitialized=useRef(false),configEdited=useRef(false),customSource=useRef(false);const queryCatalog=useRef<{product:Product;materials:Material[]}|null>(null);
 const changeConfig=(next:PrintConfig)=>{configEdited.current=true;setConfig(next)};
 useEffect(()=>{
  if(customSource.current||busy)return;
  const params=new URLSearchParams(window.location.search);const p=products.find(p=>p.id===params.get('product')&&p.available);if(!p||(queryCatalog.current?.product===p&&queryCatalog.current.materials===materials))return;
  let cancelled=false;
  queueMicrotask(()=>{
   if(cancelled||customSource.current)return;
   setProduct(p);
   const initial=productConfig(p,materials);const selected=params.get('color');const allowed=productMaterials(p,materials).find(m=>m.id===initial.material);if(selected&&allowed?.colors.includes(selected))initial.color=selected;
   const nextStats=productStats(p);
   setConfig(previous=>{
    if(!configEdited.current)return initial;
    const currentMaterial=productMaterials(p,materials).find(m=>m.id===previous.material);
    if(!currentMaterial)return initial;
    const clampedSize=Math.max(10,Math.min(previous.size,Math.min(300,maximumPrintScale(nextStats.dimensions))));
    const color=currentMaterial.colors.includes(previous.color)?previous.color:currentMaterial.colors[0];
    if(clampedSize===previous.size&&color===previous.color)return previous;
    return{...previous,size:clampedSize,color};
   });
   queryInitialized.current=true;queryCatalog.current={product:p,materials};setStats(nextStats);setViewReady(true);
  });
  return()=>{cancelled=true};
 },[products,materials,busy]);
 async function load(next:File){
  if(busy)return;
  setError('');
  if(!/\.(stl|3mf)$/i.test(next.name)){setError(t('Choose an STL or 3MF file.','اختر ملف STL أو 3MF.'));return}
  if(next.size>15*1024*1024){setError(t('Choose a model smaller than 15 MB.','اختر نموذجًا أصغر من ١٥ ميغابايت.'));return}
  setBusy(true);setUploadPhase('opening');setPendingName(next.name);setViewReady(false);
  try{
   const {parseModel}=await import('./ModelViewport');const local=await parseModel(next);
   const parsedGeometries=new Set<BufferGeometry>(),parsedMaterials=new Set<ThreeMaterial>(),parsedTextures=new Set<Texture>();
   local.object.traverse(o=>{const mesh=o as Mesh;if(mesh.geometry)parsedGeometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>parsedMaterials.add(m))});
   parsedMaterials.forEach(m=>{Object.values(m).forEach(value=>{if(value&&typeof value==='object'&&'isTexture' in value&&value.isTexture)parsedTextures.add(value as Texture)});m.dispose()});parsedTextures.forEach(texture=>texture.dispose());parsedGeometries.forEach(geometry=>geometry.dispose());
   setUploadPhase('uploading');const form=new FormData();form.set('file',next);const data=await request<{id:string;stats:Stats}>('/api/uploads',{method:'POST',body:form});
   customSource.current=true;setQuote(null);setQuoteKey('');setProduct(null);setFile(next);setStats(data.stats);setUploadId(data.id);setWireframe(false);setConfig(previous=>({...previous,size:Math.max(10,Math.min(previous.size,maximumPrintScale(data.stats.dimensions)))}));setViewReady(true);
  }catch(e){setViewReady(!!stats);setError(e instanceof Error?e.message:t('Upload failed. Your file is still on your device. Try again.','تعذر الرفع. ملفك محفوظ على جهازك. حاول مجددًا.'))}finally{setBusy(false);setUploadPhase(null)}
 }
 const dropState=useRef({load,busy});
 useEffect(()=>{dropState.current={load,busy}});
 useEffect(()=>{
  const isFile=(event:DragEvent)=>Array.from(event.dataTransfer?.types??[]).includes('Files');
  const over=(event:DragEvent)=>{if(!isFile(event))return;event.preventDefault();if(!dropState.current.busy)setDrag(true)};
  const drop=(event:DragEvent)=>{if(!isFile(event))return;event.preventDefault();setDrag(false);const next=event.dataTransfer?.files[0];if(next&&!dropState.current.busy)void dropState.current.load(next)};
  const leave=(event:DragEvent)=>{if(event.clientX<=0||event.clientY<=0||event.clientX>=innerWidth||event.clientY>=innerHeight)setDrag(false)};
  window.addEventListener('dragover',over);window.addEventListener('drop',drop);window.addEventListener('dragleave',leave);
  return()=>{window.removeEventListener('dragover',over);window.removeEventListener('drop',drop);window.removeEventListener('dragleave',leave)};
 },[]);
 const baseItem=useCallback(()=>({name:product?.name??file?.name??'Custom print',productId:product?.id,uploadId:product?undefined:uploadId,config}),[product,file,uploadId,config]);
 useEffect(()=>{if(!stats||(!product&&!uploadId))return;const controller=new AbortController();const timer=setTimeout(()=>{post<Quote>('/api/quote',{item:baseItem()}).then(q=>{if(!controller.signal.aborted){setQuote(q);setQuoteKey(JSON.stringify(baseItem()));setError('')}}).catch(e=>{if(!controller.signal.aborted){setQuote(null);setError(e.message)}})},250);return()=>{controller.abort();clearTimeout(timer)}},[stats,baseItem,product,uploadId]);
 async function analyze(){const item=baseItem();const key=JSON.stringify(item);setAnalyzing(true);setError('');try{const next=await post<Quote>('/api/quote',{item,analyze:true});if(currentItemKey.current===key){setQuote(next);setQuoteKey(key)}}catch(e){if(currentItemKey.current===key)setError((e as Error).message)}finally{setAnalyzing(false)}}
 const currentItemKey=useRef('');const itemKey=JSON.stringify(baseItem());useEffect(()=>{currentItemKey.current=itemKey},[itemKey]);const quoteCurrent=quoteKey===itemKey;const tooBig=stats&&!fitsPrinter(stats.dimensions,config.size);const col=materials.find(m=>m.id===config.material)?.swatches?.find(c=>c.id===config.color)??colors.find(c=>c.id===config.color)??colors[0];let localQuote:Quote|null=null;try{const material=materials.find(m=>m.id===config.material);if(stats&&material)localQuote=calculateQuote(config,material,stats,product??undefined,'pickup',undefined,shared.profiles)}catch{} const displayQuote=quoteCurrent?quote:localQuote;
 function addToCart(){if(!quote||!quoteCurrent||tooBig||busy||added)return;addItem({...baseItem(),price:quote.total,discount:quote.breakdown.discount,colorHex:col.hex,kind:product?.kind??'vase',dimensions:quote.dimensions,file:file??undefined});setAdded(true);window.clearTimeout(addedTimer.current);addedTimer.current=window.setTimeout(()=>setAdded(false),1400)}
 useEffect(()=>()=>window.clearTimeout(addedTimer.current),[]);
 const hasObject=!!stats&&viewReady;
 const uploadStatus=uploadPhase==='opening'?t('Opening your model…','نفتح نموذجك…'):t('Uploading your private file…','نرفع ملفك الخاص…');
 const physicalMaterial=materials.find(m=>m.id===config.material)?.name??config.material,layerHeight=shared.profiles.find(p=>p.id===config.quality)?.layer,heightMM=stats?.dimensions[2];
 const worldScene=useMemo<WorldScene>(()=>({shot:hasObject?'product':'lab',tone:'ink',rtl:ar,kind:product?.kind??'vase',file,modelUrl:product?.modelId?'/api/uploads/'+product.modelId:undefined,color:col.hex,material:physicalMaterial,quality:config.quality,layerHeight,heightMM,finishing:config.finishing,size:config.size/100,wireframe,measurements:optionMode==='size',analyzing,drag,onStats:product?.modelId?setStats:undefined,onError:setError}),[hasObject,ar,product?.kind,product?.modelId,file,col.hex,physicalMaterial,config.quality,layerHeight,heightMM,config.finishing,config.size,wireframe,optionMode,analyzing,drag]);
 useEffect(()=>{setScene(worldScene)},[worldScene,setScene]);
 return <section className={`make-page world-lab ${hasObject?'has-object':'is-empty'} ${drag?'drag-over':''}`}>
  <input ref={input} type="file" accept=".stl,.3mf" className="sr-only" aria-label={t('Choose 3D model','اختر نموذجًا ثلاثي الأبعاد')} onChange={e=>{if(e.target.files?.[0])void load(e.target.files[0]);e.target.value=''}}/>
  {!hasObject?<div className="lab-empty-scene" aria-busy={busy}>
   <div className="world-shot-top hud"><span>{t('CUSTOM / OPEN SPACE','مخصص / مساحة مفتوحة')}</span><span>STL / 3MF</span></div>
   <h1 className={`world-display lab-drop-type ${drag?'drop-type-spread':''}`}><span>{drag?t('LET','ضعه'):t('DROP','ضع')}</span><span>{drag?t('IT','هنا.'):t('A','نموذجًا')}</span><span>{drag?t('GO.',''):t('MODEL.','هنا.')}</span></h1>
   <div className="lab-empty-copy hud"><p>{busy?uploadStatus:drag?t('The whole world is your drop zone.','العالم كله مساحة لنموذجك.'):t('Your file. Our printer.','ملفك. طابعتنا.')}</p><button type="button" className="world-action world-action-main" disabled={busy} onClick={()=>input.current?.click()}>{busy?t('Opening model','نفتح النموذج'):t('Choose a file','اختر ملفًا')}<DirectionArrow diagonal/></button><span>{busy?pendingName:t('Or drop it anywhere','أو ضعه في أي مكان')}</span></div>
   {busy&&<div className="lab-real-progress hud" role="status" aria-live="polite"><span className="world-status-dot"/>{uploadStatus}</div>}
   {error&&<p className="lab-upload-error hud" role="alert"><AlertCircle size={17}/>{error}</p>}
   <div className="world-shot-bottom hud"><span>{t('PRIVATE FILES / UP TO 15 MB','ملفات خاصة / حتى ١٥ ميغابايت')}</span><Link href="/objects">{t('Start with an object','ابدأ بقطعة')} ↗</Link></div>
  </div>:<div className="world-product-stage">
   <div className="product-stage-top hud"><div><Link href={product?'/objects':'/lab'} className="world-back">{product?t('← Object archive','أرشيف القطع ←'):t('CUSTOM / 001','مخصص / ٠٠١')}</Link><span className="product-source">{file?.name??t('OBJECT / '+String(products.findIndex(p=>p.id===product?.id)+1).padStart(3,'0'),'قطعة / '+String(products.findIndex(p=>p.id===product?.id)+1).padStart(3,'0'))}</span></div><button type="button" className="world-change-model" disabled={busy} onClick={()=>input.current?.click()}>{t('Change model','تغيير النموذج')} ↗</button></div>
   <h1 className="world-display product-stage-type">{product?(ar?product.nameAr:product.name.replace(/^The /,'').split(' ')[0]):t('YOUR FORM.','شكلك.')}</h1>
   <div className="product-viewer-tools hud"><WorldControls ar={ar} wireframe={wireframe} onWireframe={setWireframe}/></div>
   <div className={`product-dimensions hud ${optionMode==='size'?'dimensions-visible':''}`}><span>{t('DIMENSIONS','الأبعاد')}</span>{stats.dimensions.map((d,i)=><div key={i}><span>{['X','Y','Z'][i]}</span><strong dir="ltr">{Math.round(d*config.size/100)}<small>MM</small></strong></div>)}</div>
   <div className="product-render-state hud" role="status">{analyzing?t('ANALYZING LAYERS','نحلل الطبقات'):!ready&&!failed?t('FORMING GEOMETRY','نشكل الهندسة'):t('DRAG TO TURN / + − TO ZOOM','اسحب للتدوير / + − للتكبير')}</div>
   <div className="product-configuration-dock hud"><PrintOptions ar={ar} config={config} setConfig={changeConfig} materials={productMaterials(product??undefined,materials)} dimensions={stats.dimensions} palette={colors} sizeOptions={product?.sizeOptions} profiles={shared.profiles} onModeChange={setOptionMode}/></div>
   <div className="world-price-hud hud"><span>{displayQuote?.source==='slicer'?t('QUOTE READY','السعر جاهز'):t('ESTIMATE','تقدير')}</span><WorldPrice value={displayQuote?.total}/><span dir="ltr">{displayQuote?`${formatTime(displayQuote.minutes)} / ${displayQuote.grams} G`:'…'}</span>{displayQuote&&displayQuote.breakdown.discount>0&&<span className="world-price-saved" dir="ltr">{formatPrice(displayQuote.breakdown.discount)}− SAR · {Math.round(displayQuote.breakdown.discountRate*100)}% {t('volume','كمية')}</span>}<button type="button" className="world-action world-action-main" disabled={!quote||!quoteCurrent||!!tooBig||busy||added} aria-live="polite" onClick={addToCart}>{added?<><Check size={16}/>{t('Added','أُضيفت')}</>:<>{t('Make this','اصنعها')}<DirectionArrow/></>}</button></div>
   <div className="product-stage-foot hud"><span>{t('PRINTED IN JUBAIL / PAYMENT BEFORE PRINTING','نطبعها في الجبيل / الدفع قبل الطباعة')}</span>{!product&&shared.slicingAvailable?<button type="button" disabled={analyzing||!!tooBig||busy} onClick={analyze}>{analyzing?t('Analyzing layers…','نحلل الطبقات…'):t('Analyze the print','تحليل الطباعة')} ↗</button>:<span>{t('Studio review before printing','مراجعة الاستوديو قبل الطباعة')}</span>}</div>
   {error&&<div className="product-stage-error hud" role="alert"><AlertCircle size={16}/>{error}</div>}
  </div>}
 </section>;
}
export function CatalogFlow(shared:Shared){
 const {ar,products,categories,palette}=shared;
 const t=(en:string,arabic:string)=>ar?arabic:en;
 const {setScene}=useMaterialWorld();
 const [viewMode,setViewMode]=useState<'gallery'|'cinema'>('gallery');
 const [category,setCategory]=useState('All');
 const [search,setSearch]=useState('');
 const [sort,setSort]=useState('curated');

 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  if(params.get('view')!=='cinema')return;
  let cancelled=false;
  queueMicrotask(()=>{if(!cancelled)setViewMode('cinema')});
  return()=>{cancelled=true};
 },[]);

 useEffect(()=>{
  if(viewMode==='gallery'){
   setScene({shot:'hidden',tone:'paper'});
  }
 },[viewMode,setScene]);

 const categoryLabels:Record<string,string>={
  'All':'الكل',
  'Desk setup':'للمكتب',
  'Room':'للغرفة',
  'Useful':'عملي',
  'Gifts':'هدايا',
  'Miniatures':'مجسمات'
 };

 if(viewMode==='cinema'){
  return <div className="catalog-cinema-wrap">
   <ObjectArchive {...shared} onShowGallery={()=>setViewMode('gallery')}/>
  </div>;
 }

 const available=products.filter(p=>p.available).sort((a,b)=>Number(b.featured)-Number(a.featured));
 const visible=available.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.nameAr} ${p.description}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);

 return <section className="object-gallery shop-page" aria-label={t('Objects catalog','معرض القطع')}>
  <div className="object-gallery-heading">
   <h1>{t('OBJECTS.','القطع.')}</h1>
   <div>
    <p>{t('Made to order in Jubail.','تُصنع عند طلبك في الجبيل.')}</p>
    <span>{t('Every object begins as a digital model and takes physical form layer by layer.','كل قطعة تبدأ كنموذج رقمي وتتجسد طبقة فوق طبقة.')}</span>
   </div>
  </div>

  <div className="object-gallery-tools">
   <Tabs value={category} onValueChange={setCategory}>
    <TabsList className="category-tabs" role="tablist" aria-label={t('Object categories','فئات القطع')}>
     {categories.map(c=><TabsTrigger key={c} value={c}>{t(c,categoryLabels[c]??c)}</TabsTrigger>)}
    </TabsList>
   </Tabs>

   <div className="shop-tools">
    <div className="search-field">
     <Search size={16}/>
     <input type="search" aria-label={t('Search catalog','ابحث في القطع')} placeholder={t('Search…','بحث…')} value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
    <select className="gallery-sort-select" aria-label={t('Sort catalog','ترتيب القطع')} value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="curated">{t('Curated','المميزة')}</option>
     <option value="low">{t('Price: low to high','السعر: الأقل أولاً')}</option>
     <option value="high">{t('Price: high to low','السعر: الأعلى أولاً')}</option>
    </select>
    <button type="button" className="world-action gallery-cinema-btn" onClick={()=>setViewMode('cinema')}>
     {t('Cinema 3D','سينما 3D')} ↗
    </button>
   </div>
  </div>

  <p className="results-count" role="status">{visible.length} {t('objects ready to print','قطع جاهزة للطباعة')}</p>

  <div className="object-gallery-grid">
   {visible.map((product,idx)=>{
    const compIdx=idx%6;
    const colorHex=palette.find(c=>c.id===product.color)?.hex??'#efeee5';
    const modelUrl=product.modelId?'/api/uploads/'+product.modelId:undefined;
    const name=ar?product.nameAr:product.name.replace(/^The /,'');
    return <Link key={product.id} href={`/make?product=${product.id}&color=${product.color}`} className={`object-gallery-piece composition-${compIdx}`} aria-label={name}>
     <div className="object-gallery-stage">
      <Suspense fallback={<div className="object-loading"/>}>
       <ModelViewport compact kind={product.kind} color={colorHex} modelUrl={modelUrl} ar={ar}/>
      </Suspense>
     </div>
     <div className="object-gallery-meta">
      <div>
       <strong>{name}</strong>
       <span>{t(product.category,categoryLabels[product.category]??product.category)} · {product.dimensions.join(' × ')} MM</span>
      </div>
      <span>{t('from','من')} <strong>{product.price}</strong> SAR</span>
     </div>
     <span className="gallery-open" aria-hidden="true"><DirectionArrow diagonal/></span>
    </Link>;
   })}
  </div>

  {!visible.length&&<div className="index-empty">
   <p>{t('No objects matched your search.','لم نجد قطعًا تطابق بحثك.')}</p>
   <button type="button" className="world-action" onClick={()=>{setSearch('');setCategory('All')}}>{t('Show all objects','عرض جميع القطع')}</button>
  </div>}

  <div className="gallery-upload-link">
   <p>{t('Have your own 3D file ready to print?','لديك ملف ثلاثي الأبعاد جاهز للطباعة؟')}</p>
   <Link href="/lab" className="text-link"><span>{t('Upload to studio lab','ارفع للمختبر')}</span><DirectionArrow diagonal/></Link>
  </div>
 </section>;
}
export function CartContents(shared:Shared){return <CartJourney {...shared}/>}
export function CheckoutFlow(shared:Shared){return <CheckoutJourney {...shared}/>}
type Order={id:string;status:string;payment?:OrderPayment;total:number;fulfillment:string;area:string;items:Item[];history:{status:string;message:string;created:number}[];version:number;customer?:string;phone?:string;notes?:string;quote?:{items:Quote[];delivery:number};created:number};
const statusNames:Record<string,[string,string]>={awaiting_payment:['Awaiting payment','بانتظار الدفع'],pending:['Awaiting payment','بانتظار الدفع'],reviewed:['Reviewed','تمت المراجعة'],queued:['In the queue','في قائمة الانتظار'],printing:['Printing','قيد الطباعة'],finishing:['Finishing touches','التشطيب'],ready:['Ready for you','جاهز لك'],completed:['All yours','اكتمل الطلب'],declined:['Unable to print','تعذر تنفيذ الطلب'],changes_requested:['A little change needed','نحتاج تعديلًا بسيطًا']};
export function TrackingFlow(shared:Shared){return <TrackingJourney {...shared}/>}
export function AboutFlow({ar}:Shared){const t=(e:string,a:string)=>ar?a:e;return <section className="about-page object-about"><span className="section-kicker">{t('A local studio, a world of ideas','استوديو محلي وعالم من الأفكار')}</span><h1>{t('Digital beginnings.','بدايات رقمية.')}<br/>{t('Real-world things.','أشياء حقيقية.')}</h1><div className="about-body"><div><p>{t('Forma3D is a 3D printing studio based in Jubail. We turn digital models into objects for your desk, your room, your projects, and the people you care about.','فورما ثري دي استوديو للطباعة ثلاثية الأبعاد في الجبيل. نحول النماذج الرقمية إلى أغراض لمكتبك وغرفتك ومشاريعك ولمن تحب.')}</p><p>{t('You choose the idea. We help it take shape. Every order is reviewed before printing, so you know what to expect.','أنت تختار الفكرة ونحن نساعدها على أخذ شكلها. نراجع كل طلب قبل الطباعة لتعرف ما تتوقعه.')}</p><Link className="primary-button" href="/make">{t('Bring an idea','أحضر فكرتك')}</Link></div><div className="studio-facts"><div><MapPin size={20}/><h3>{t('Printed in Jubail','نطبع في الجبيل')}</h3><p>{t('Payment and pickup in Alhussan International School or Al Huwaylat, arranged directly with staff.','الدفع والاستلام في مدرسة الحصان العالمية أو الحويلات، بالتنسيق المباشر مع الفريق.')}</p></div><div><Package size={20}/><h3>{t('Made when you order','نصنعها عند طلبك')}</h3><p>{t('Your color, your size, your finish. Natural print layers are part of the object.','لونك وحجمك وجودتك. طبقات الطباعة الطبيعية جزء من القطعة.')}</p></div><div><Clock size={20}/><h3>{t('A review before a print','مراجعة قبل الطباعة')}</h3><p>{t('We check the model and confirm your quote and timing before production.','نتحقق من النموذج ونؤكد السعر والوقت قبل الإنتاج.')}</p></div></div></div><div className="material-guide"><h2>{t('A little material knowledge.','تعرف على المواد.')}</h2><div><article><h3>PLA</h3><p>{t('A crisp finish for display pieces and everyday objects. Best kept indoors, away from heat.','تفاصيل واضحة لقطع العرض والأغراض اليومية. يُفضل استخدامها داخل المنزل وبعيدًا عن الحرارة.')}</p></article><article><h3>Ender-3 V3 SE</h3><p>{t('220 × 220 × 250 mm build area. A 0.4 mm nozzle and five PLA colours: red, blue, grey, black and white.','مساحة طباعة ٢٢٠ × ٢٢٠ × ٢٥٠ مم وفوهة ٠٫٤ مم. خمسة ألوان PLA: الأحمر والأزرق والرمادي والأسود والأبيض.')}</p></article></div></div></section>}
function StudioLoginForm({ar,onLoginSuccess}:{ar:boolean;onLoginSuccess:()=>void}){
 const t=(en:string,arabic:string)=>ar?arabic:en;
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loginError,setLoginError]=useState('');

 async function handleSubmit(e:React.FormEvent){
  e.preventDefault();
  setBusy(true);
  setLoginError('');
  try{
   const res=await fetch('/api/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,password}),
   });
   const body=await res.json() as {error?:string;user?:{role?:string}};
   if(!res.ok)throw new Error(body.error||'Invalid credentials.');
   if(body.user?.role!=='admin'){
    throw new Error(t('This account does not have studio operator permissions.','هذا الحساب لا يملك صلاحيات المشرف على الاستوديو.'));
   }
   onLoginSuccess();
  }catch(err){
   setLoginError(err instanceof Error?err.message:'Login failed.');
  }finally{
   setBusy(false);
  }
 }

 return (
  <div className="studio-login-card" style={{
   maxWidth:440,
   margin:'40px auto',
   background:'var(--white)',
   border:'1px solid var(--border)',
   padding:'36px 30px',
   borderRadius:4,
   boxShadow:'0 8px 30px rgba(0,0,0,0.06)'
  }}>
   <div style={{marginBottom:24,textAlign:'center'}}>
    <span className="section-kicker" style={{marginBottom:8}}>{t('Authorized Staff Only','للمشرفين فقط')}</span>
    <h2 style={{fontSize:24,fontWeight:700,letterSpacing:'normal'}}>{t('Studio Operator Login','دخول المشرف على الاستوديو')}</h2>
    <p style={{fontSize:13,color:'var(--muted-foreground)',marginTop:8}}>
     {t('Sign in with your studio credentials to access the production queue and objects.','سجل دخولك ببيانات المشرف للوصول إلى قائمة الإنتاج والقطع.')}
    </p>
   </div>
   {loginError&&<div className="inline-error" role="alert" style={{marginBottom:20}}>{loginError}</div>}
   <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
    <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:500}}>
     {t('Operator Email','البريد الإلكتروني')}
     <input
      type="email"
      value={email}
      onChange={e=>setEmail(e.target.value)}
      required
      autoComplete="email"
      placeholder="operator@forma3d.com"
      style={{fontSize:16}}
     />
    </label>
    <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:500}}>
     {t('Password','كلمة المرور')}
     <div style={{position:'relative',display:'flex',alignItems:'center'}}>
      <input
       type={showPassword?'text':'password'}
       value={password}
       onChange={e=>setPassword(e.target.value)}
       required
       autoComplete="current-password"
       placeholder="••••••••••••"
       style={{fontSize:16,paddingInlineEnd:48}}
      />
      <button
       type="button"
       onClick={()=>setShowPassword(p=>!p)}
       style={{
        position:'absolute',
        insetInlineEnd:4,
        top:'50%',
        transform:'translateY(-50%)',
        background:'none',
        border:0,
        width:44,
        height:44,
        minWidth:44,
        minHeight:44,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        color:'var(--muted-foreground)',
        cursor:'pointer',
        touchAction:'manipulation'
       }}
       aria-label={showPassword?(ar?'إخفاء كلمة المرور':'Hide password'):(ar?'إظهار كلمة المرور':'Show password')}
      >
       {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
      </button>
     </div>
    </label>
    <button
     type="submit"
     className="primary-button"
     disabled={busy}
     style={{marginTop:8,width:'100%',minHeight:48}}
    >
     {busy?<Loader2 className="spin" size={18}/>:null}
     {t('Sign in to Studio','دخول الاستوديو')}
    </button>
   </form>
  </div>
 );
}

export function AdminFlow(shared:Shared){const{ar,palette:colors}=shared;const t=(e:string,a:string)=>ar?a:e;const [data,setData]=useState<{orders:Order[];products:Product[];materials:Material[];categories:string[];profiles:typeof qualityOptions;uploads:{id:string;name:string;stats:Stats;bytes:number;created:number}[]}|null>(null);const[error,setError]=useState('');const[selected,setSelected]=useState<Order|null>(null);const[edit,setEdit]=useState<{type:string;data:Product|Material}|null>(null);const[editJson,setEditJson]=useState('');const[busy,setBusy]=useState(false);const[model,setModel]=useState<File|null>(null);const[itemIndex,setItemIndex]=useState(0);const[modelBusy,setModelBusy]=useState(false);const[modelError,setModelError]=useState('');const modelRequest=useRef(0);
 const refresh=useCallback(()=>request<NonNullable<typeof data>>('/api/admin').then(d=>{setData(d);setError('')}).catch(e=>setError(e.message)),[]);useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},20000);return()=>clearInterval(timer)},[refresh]);
 async function openModel(item:Item){const turn=++modelRequest.current;setModel(null);setModelError('');setModelBusy(true);try{const source=item.uploadId??data?.products.find(p=>p.id===item.productId)?.modelId;if(source){const response=await fetch('/api/uploads/'+source);if(!response.ok)throw new Error('Could not open this model.');const ext=/\.3mf/i.test(response.headers.get('content-disposition')??'')?'.3mf':'.stl';const blob=await response.blob();if(turn===modelRequest.current)setModel(new File([blob],'model'+ext));}}catch(e){if(turn===modelRequest.current)setModelError((e as Error).message)}finally{if(turn===modelRequest.current)setModelBusy(false)}}
 async function openOrder(order:Order){setSelected(order);setItemIndex(0);if(order.items[0])await openModel(order.items[0]);}
 async function updateOrder(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;setBusy(true);const f=new FormData(e.currentTarget);try{await request('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,version:selected.version,status:f.get('status'),total:Number(f.get('total')),message:f.get('message')})});setSelected(null);await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function saveCatalog(){if(!edit)return;setBusy(true);try{await post('/api/admin',{type:edit.type,data:JSON.parse(editJson)});setEdit(null);await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function handleLogout(){try{await fetch('/api/auth/logout',{method:'POST'});setData(null);setError('');}catch{}}
  return <section className="admin-page object-admin"><div className="page-heading"><div><span className="section-kicker">{t('Behind the objects','خلف القطع')}</span><h1>{t('The studio.','الاستوديو.')}</h1><p>{t('Review a print. Keep things moving.','راجع الطباعة واستمر في الإنتاج.')}</p></div><div style={{display:'flex',gap:10}}><button className="secondary-button" onClick={()=>void refresh()}>{t('Refresh','تحديث')}</button>{data&&<button className="secondary-button" onClick={()=>void handleLogout()}><LogOut size={15}/> {t('Sign out','خروج')}</button>}</div></div>{!data&&<StudioLoginForm ar={ar} onLoginSuccess={()=>void refresh()}/>}{data&&<><div className="admin-metrics">{[[t('Waiting for review','بانتظار المراجعة'),data.orders.filter(o=>o.status==='pending').length],[t('Active prints','طباعات نشطة'),data.orders.filter(o=>o.status==='printing').length],[t('Queue hours','ساعات القائمة'),Math.round(data.orders.filter(o=>['reviewed','queued','printing'].includes(o.status)).reduce((s,o)=>s+(o.quote?.items.reduce((t,q)=>t+q.minutes,0)??0),0)/60)],[t('Completed','مكتملة'),data.orders.filter(o=>o.status==='completed').length],[t('Order value · SAR','قيمة الطلبات · ريال'),formatPrice(data.orders.filter(o=>o.status!=='declined').reduce((s,o)=>s+o.total,0))],[t('Low stock','مخزون منخفض'),data.materials.filter(m=>m.stock<=m.threshold).length]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><Tabs defaultValue="orders"><TabsList><TabsTrigger value="orders">{t('Orders','الطلبات')}</TabsTrigger><TabsTrigger value="support">{t('Support requests','طلبات الدعم')}</TabsTrigger><TabsTrigger value="products">{t('Objects','القطع')}</TabsTrigger><TabsTrigger value="uploads">{t('Recent models','النماذج الأخيرة')}</TabsTrigger><TabsTrigger value="materials">{t('Materials','المواد')}</TabsTrigger><TabsTrigger value="profiles">{t('Print profiles','ملفات الطباعة')}</TabsTrigger><TabsTrigger value="categories">{t('Categories','الفئات')}</TabsTrigger></TabsList><TabsContent value="orders"><div className="admin-table"><Table><TableHeader><TableRow>{[t('Order','الطلب'),t('Customer','العميل'),t('Print','الطباعة'),t('Status','الحالة'),t('Quote','السعر'),t('Review','مراجعة')].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{data.orders.map(o=><TableRow key={o.id}><TableCell><b dir="ltr">{o.id}</b><small>{new Date(o.created).toLocaleDateString()}</small></TableCell><TableCell>{o.customer}<small dir="ltr">{o.phone}</small></TableCell><TableCell>{o.items[0]?.name}<small>{o.items.length} {t('item(s)','قطعة')}</small></TableCell><TableCell><span className={'status-pill '+o.status}>{t(...(statusNames[o.status]??statusNames.pending))}</span><small>{o.payment?.status==='paid'?t('Payment verified','الدفع مؤكد'):t('Unpaid','غير مدفوع')}</small></TableCell><TableCell>SAR {formatPrice(o.total)}</TableCell><TableCell><button className="secondary-button" onClick={()=>void openOrder(o)}>{t('Open','فتح')}</button></TableCell></TableRow>)}</TableBody></Table></div>{!data.orders.length&&<div className="empty-state"><Package size={32}/><h2>{t('The next idea starts here.','الفكرة القادمة تبدأ هنا.')}</h2><p>{t('New orders will arrive here for your review.','تظهر الطلبات الجديدة هنا لمراجعتها.')}</p></div>}</TabsContent><TabsContent value="support"><Suspense fallback={<div/>}><SupportInbox ar={ar}/></Suspense></TabsContent><TabsContent value="uploads"><div className="admin-edit-list">{data.uploads?.map(u=><div key={u.id}><strong>{u.name}</strong><span dir="ltr">{u.stats.dimensions.map(d=>Math.round(d)).join(' × ')} mm</span><span>{(u.bytes/1024).toFixed(0)} KB</span><span>{new Date(u.created).toLocaleDateString(ar?'ar-SA':'en-GB')}</span><a className="secondary-button" href={'/api/uploads/'+u.id}>{t('Download private model','تحميل النموذج الخاص')}</a></div>)}{!data.uploads?.length&&<p>{t('Private models will appear here after upload.','تظهر النماذج الخاصة هنا بعد رفعها.')}</p>}</div></TabsContent><TabsContent value="products"><div className="admin-edit-list">{data.products.map(p=><div key={p.id}><strong>{p.name}</strong><span>{p.category}</span><span>SAR {formatPrice(p.price)}</span><span>{p.available?t('Available','متاح'):t('Hidden','مخفي')}</span><button className="secondary-button" onClick={()=>{setEdit({type:'product',data:p});setEditJson(JSON.stringify(p,null,2))}}>{t('Edit','تعديل')}</button></div>)}<button className="primary-button" onClick={()=>{const p={...data.products[0],id:'new-object',name:'New object',nameAr:'قطعة جديدة',available:false};setEdit({type:'product',data:p});setEditJson(JSON.stringify(p,null,2))}}>{t('Add an object','أضف قطعة')}</button></div></TabsContent><TabsContent value="materials"><div className="admin-edit-list">{data.materials.map(m=><div key={m.id}><strong>{m.name}</strong><span>{m.stock} kg</span><span>SAR {m.cost}/kg</span><span className={m.stock<=m.threshold?'inline-error':''}>{m.stock<=m.threshold?t('Low stock','مخزون منخفض'):t('In stock','متوفر')}</span><button className="secondary-button" onClick={()=>{setEdit({type:'material',data:m});setEditJson(JSON.stringify(m,null,2))}}>{t('Edit','تعديل')}</button></div>)}<button className="primary-button" onClick={()=>{const m={...data.materials[0],id:'new-material',name:'New material',available:false};setEdit({type:'material',data:m});setEditJson(JSON.stringify(m,null,2))}}>{t('Add material','أضف مادة')}</button></div></TabsContent><TabsContent value="profiles"><Suspense fallback={<div/>}><ProfileEditor profiles={data.profiles} ar={ar} onSave={async values=>{await post('/api/admin',{type:'profiles',data:{values}});await refresh()}}/></Suspense></TabsContent><TabsContent value="categories"><form className="category-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const values=String(f.get('categories')).split('\n').map(c=>c.trim()).filter(Boolean);if(!values.includes('All'))values.unshift('All');await post('/api/admin',{type:'categories',data:{values}});await refresh()}catch(e){setError((e as Error).message)}}}><label>{t('One category per line','فئة واحدة في كل سطر')}<textarea name="categories" defaultValue={data.categories.join('\n')} rows={8}/></label><button className="primary-button">{t('Save categories','حفظ الفئات')}</button></form></TabsContent></Tabs></>}
 <Dialog open={!!selected} onOpenChange={v=>{if(!v)setSelected(null)}}><DialogContent className="order-dialog"><DialogTitle>{t('Review the print','مراجعة الطباعة')}</DialogTitle><DialogDescription>{selected?.id}</DialogDescription>{selected&&<><div className="admin-order-grid"><div><Select value={String(itemIndex)} onValueChange={v=>{setItemIndex(Number(v));void openModel(selected.items[Number(v)])}}><SelectTrigger aria-label="Select order model"><SelectValue/></SelectTrigger><SelectContent>{selected.items.map((item,i)=><SelectItem key={i} value={String(i)}>{item.name}</SelectItem>)}</SelectContent></Select><div className="admin-model"><>{modelBusy?<div className="viewer-loading">Loading model…</div>:modelError?<div role="alert" className="inline-error">{modelError}</div>:<Suspense fallback={<div/>}><ModelViewport file={model} kind={data?.products.find(p=>p.id===selected.items[itemIndex]?.productId)?.kind} color={colors.find(c=>c.id===selected.items[itemIndex]?.config.color)?.hex} ar={ar}/></Suspense>}</></div><div className="order-specs"><b>{selected.customer}</b><span dir="ltr">{selected.phone}</span><span>{selected.fulfillment} · {selected.area}</span><p>{selected.notes||t('No notes.','بدون ملاحظات.')}</p>{selected.items.map((item,i)=><div key={i}><strong>{item.name}</strong><span>{item.config.quantity} × {item.config.size}% · {item.config.material.toUpperCase()} · {item.config.color} · {item.config.quality}</span><span dir="ltr">{selected.quote?.items[i]?.dimensions.join(' × ')} mm</span><span>{selected.quote?.items[i]?.grams}g · {formatTime(selected.quote?.items[i]?.minutes??0)} · {selected.quote?.items[i]?.source==='slicer'?'Slicer result':'Provisional estimate'}</span>{item.uploadId&&<a className="text-link" href={'/api/uploads/'+item.uploadId}><Download size={14}/>{t('Download private model','تحميل النموذج الخاص')}</a>}</div>)}<div className="history-list"><h3>{t('Order history','سجل الطلب')}</h3>{selected.history?.slice().reverse().map((h,i)=><div key={i}><span>{new Date(h.created).toLocaleString(ar?'ar-SA':'en-GB',{timeZone:'Asia/Riyadh'})}</span><p>{h.message}</p></div>)}</div></div></div><div><AdminPaymentPanel key={selected.id+selected.version} order={selected} ar={ar} onConfirmed={async()=>{const latest=await request<NonNullable<typeof data>>('/api/admin');setData(latest);setSelected(latest.orders.find(o=>o.id===selected.id)??null);setError('')}}/><form key={selected.version} className="admin-order-form" onSubmit={updateOrder}><label>{t('Production status','حالة الإنتاج')}<select name="status" defaultValue={selected.status}>{Object.entries(statusNames).map(([s,n])=><option key={s} value={s} disabled={selected.payment?.status!=='paid'&&['queued','printing','finishing','ready','completed'].includes(s)}>{t(...n)}</option>)}</select></label><label>{t('Confirmed quote · SAR','السعر المؤكد · ريال')}<input name="total" type="number" min=".01" max="100000" step=".01" defaultValue={selected.total} readOnly={selected.payment?.status==='paid'} required/></label><label>{t('Update for the customer','تحديث للعميل')}<textarea name="message" minLength={2} maxLength={1000} required defaultValue={t('Your print has been reviewed. We will contact you to confirm the details.','تمت مراجعة طباعتك. نتواصل معك لتأكيد التفاصيل.')}/></label><button className="primary-button" disabled={busy}>{busy?<Loader2 className="spin" size={17}/>:<Check size={17}/>} {t('Save update','حفظ التحديث')}</button>{error&&<p className="inline-error">{error}</p>}</form></div></div></>}</DialogContent></Dialog>
 <Dialog open={!!edit} onOpenChange={v=>{if(!v)setEdit(null)}}><DialogContent className="catalog-dialog"><DialogTitle>{t('Edit studio item','تعديل عنصر الاستوديو')}</DialogTitle><DialogDescription>{t('Set the details, upload a model, and choose what customers can customize.','حدد التفاصيل وارفع نموذجًا واختر ما يمكن للعملاء تخصيصه.')}</DialogDescription><>{edit&&data&&<Suspense fallback={<div>Loading editor…</div>}><CatalogEditor type={edit.type} data={JSON.parse(editJson)} onChange={d=>setEditJson(JSON.stringify(d))} materials={data.materials} categories={data.categories} ar={ar}/></Suspense>}</>{error&&<p className="inline-error">{error}</p>}<button className="primary-button" disabled={busy} onClick={saveCatalog}>{t('Save item','حفظ العنصر')}</button></DialogContent></Dialog>
 </section>
}
