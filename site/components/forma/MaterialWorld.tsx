'use client';

import {createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject} from 'react';
import type {ProductKind} from '@/lib/catalog';
import type {ModelStats} from './ModelViewport';

export type WorldScene = {
  shot: 'hero'|'macro'|'archive'|'product'|'lab'|'invitation'|'local'|'receipt'|'tracking'|'hidden';
  tone: 'cobalt'|'paper'|'ink'|'heat';
  kind?: ProductKind;
  color?: string;
  file?: File|null;
  modelUrl?: string;
  material?: string;
  quality?: string;
  layerHeight?: number;
  heightMM?: number;
  finishing?: string;
  size?: number;
  wireframe?: boolean;
  measurements?: boolean;
  analyzing?: boolean;
  drag?: boolean;
  index?: number;
  stage?: string;
  rtl?: boolean;
  onStats?: (stats:ModelStats)=>void;
  onError?: (message:string)=>void;
};
export type WorldCommand = 'reset'|'left'|'right'|'in'|'out'|'top'|'front'|'side';
type WorldContext = {scene:WorldScene;setScene:(scene:WorldScene)=>void;command:(command:WorldCommand)=>void;ready:boolean;failed:boolean};
// Vinext hot reload can briefly retain two versions of a client module. Keep
// browser context identity stable so a refreshed HUD still sees its provider.
const contextKey=Symbol.for('forma.material-world.context');
const contexts=globalThis as typeof globalThis&{[contextKey]?:ReturnType<typeof createContext<WorldContext|null>>};
const Context=typeof window==='undefined'?createContext<WorldContext|null>(null):(contexts[contextKey]??=createContext<WorldContext|null>(null));
const WorldRenderer=lazy(()=>import('./WorldRenderer'));

export function MaterialWorld({children,route}:{children:ReactNode;route:string}) {
  const [scene,setSceneState]=useState<WorldScene>({shot:route==='home'?'hero':route==='make'?'lab':route==='shop'?'archive':'hidden',tone:route==='home'||route==='shop'?'cobalt':route==='make'?'ink':'paper',kind:'vase',color:'#efeee5'});
  const setScene=useCallback((next:WorldScene)=>setSceneState(previous=>{
    const keys=new Set([...Object.keys(previous),...Object.keys(next)]);
    return [...keys].every(key=>previous[key as keyof WorldScene]===next[key as keyof WorldScene])?previous:next;
  }),[]);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const commandRef=useRef<((command:WorldCommand)=>void)|null>(null);
  const command=useCallback((value:WorldCommand)=>commandRef.current?.(value),[]);
  const value=useMemo(()=>({scene,setScene,command,ready,failed}),[scene,setScene,command,ready,failed]);
  return <Context.Provider value={value}><div className={`material-world world-tone-${scene.tone}`} data-world-shot={scene.shot}>
    {route!=='admin'&&<Suspense fallback={null}><WorldRenderer scene={scene} commandRef={commandRef} onReady={setReady} onFailed={setFailed}/></Suspense>}
    <div className="world-grain" aria-hidden="true"/>
    {children}
  </div></Context.Provider>;
}

export function useMaterialWorld(){const context=useContext(Context);if(!context)throw new Error('World context is missing.');return context;}

/** Native scrolling selects a shot; it never captures or rewrites scroll input. */
export function useWorldShot(ref:RefObject<HTMLElement|null>,scene:WorldScene){
  const {setScene}=useMaterialWorld();
  const active=useRef(false),sceneRef=useRef(scene);
  useEffect(()=>{sceneRef.current=scene;if(active.current)setScene(scene)},[scene,setScene]);
  useEffect(()=>{
    const element=ref.current;if(!element)return;
    let frame=0;
    const check=()=>{
      frame=0;const bounds=element.getBoundingClientRect(),middle=innerHeight*.49;
      const visible=bounds.top<=middle&&bounds.bottom>middle;
      if(visible&&!active.current)setScene(sceneRef.current);
      active.current=visible;
    };
    const scroll=()=>{if(!frame)frame=requestAnimationFrame(check)};
    check();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll)};
  },[ref,setScene]);
}
