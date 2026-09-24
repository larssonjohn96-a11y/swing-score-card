import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { offTeeResult, handicapLabel, type TeeShot } from "@/lib/offtee";
import { loadLongDriveSessions, saveLongDriveSession, sessionBest, todayISO } from "@/lib/longdrive";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
type Mode="longdrive"|"offtee"; type Shot={distance:number;lateral:number;side:"left"|"right"|"center"}; type Saved={id:string;at:number;shots:Shot[]};
const KEY="sg4-offtee-three-shot-v1",fmt=(n:number)=>n.toFixed(1).replace(".",",");
const tee=(a:Shot[]):TeeShot[]=>a.map((s,i)=>({index:i+1,filled:true,total:s.distance,sidled:s.lateral,direction:s.side==="left"?"left":"right"}));
function loadOfftee():Saved[]{try{const v=JSON.parse(localStorage.getItem(KEY)??"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function saveOfftee(x:Saved){localStorage.setItem(KEY,JSON.stringify([...loadOfftee(),x].slice(-30)))}
export function ThreeShotDriverTest({mode,onExit}:{mode:Mode;onExit:()=>void}){
 const long=mode==="longdrive",title=long?"Long Drive":"Utslag";
 const [view,setView]=useState<"intro"|"countdown"|"test"|"compiling"|"result">("intro"),[countdown,setCountdown]=useState(3),[shots,setShots]=useState<Shot[]>([]);
 const [distance,setDistance]=useState(long?"250":"220"),[lateral,setLateral]=useState("0"),[side,setSide]=useState<"left"|"right">("right"),[compile,setCompile]=useState(0);
 const [confirmExit,setConfirmExit]=useState(false),[analysis,setAnalysis]=useState(false),[hcpReady,setHcpReady]=useState(false); const timers=useRef<number[]>([]);
 useChipScreenColor(view==="countdown"||view==="compiling"||analysis);
 const result=useMemo(()=>shots.length===3?offTeeResult(tee(shots)):null,[shots]),best=Math.max(0,...shots.map(s=>s.distance)),avg=shots.length?shots.reduce((a,s)=>a+s.distance,0)/shots.length:0;
 const pb=typeof window==="undefined"?0:long?Math.max(0,...loadLongDriveSessions().map(sessionBest)):Math.max(0,...loadOfftee().flatMap(t=>t.shots.map(s=>s.distance)));
 const clear=()=>{timers.current.forEach(window.clearTimeout);timers.current=[]}; useEffect(()=>clear,[]);
 useEffect(()=>{if(view!=="countdown")return;setCountdown(3);const start=performance.now(),duration=2400,id=window.setInterval(()=>{const left=Math.max(0,duration-(performance.now()-start));setCountdown(left/800);if(left<=0){window.clearInterval(id);setView("test")}},40);return()=>window.clearInterval(id)},[view]);
 useEffect(()=>{if(view!=="compiling")return;setCompile(0);clear();timers.current=[window.setTimeout(()=>setCompile(1),850),window.setTimeout(()=>setCompile(2),1750),window.setTimeout(()=>setCompile(3),2650),window.setTimeout(()=>setView("result"),3400)];return clear},[view]);
 useEffect(()=>{if(!analysis)return;setHcpReady(false);const r=window.matchMedia("(prefers-reduced-motion: reduce)").matches,id=window.setTimeout(()=>setHcpReady(true),r?0:1500);return()=>window.clearTimeout(id)},[analysis]);
 function start(){setShots([]);setDistance(long?"250":"220");setLateral("0");setSide("right");setView("countdown")}
 function add(){const d=Number(distance.replace(",",".")),l=long?0:Number(lateral.replace(",","."));if(!Number.isFinite(d)||d<=0||d>400||!Number.isFinite(l)||l<0||l>200)return;const next=[...shots,{distance:d,lateral:l,side:l===0?"center":side} as Shot];setShots(next);if(next.length===3){if(long)saveLongDriveSession({date:todayISO(),carries:next.map(s=>s.distance),unit:"m"});else saveOfftee({id:crypto.randomUUID(),at:Date.now(),shots:next});setView("compiling")}}
 function abort(){clear();setConfirmExit(false);setShots([]);onExit()} const shotNo=Math.min(3,shots.length+1),hcp=result?.handicap??null;
 return <main className="mx-auto min-h-[calc(100dvh-58px)] max-w-md bg-slate-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 text-slate-950">
 <style>{`@keyframes dSheen{0%{transform:translateX(-140%);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(260%);opacity:0}}.d-sheen{opacity:0;animation:dSheen 1.15s ease .2s 1}@media(prefers-reduced-motion:reduce){.d-sheen{animation:none!important}}`}</style>
 {view!=="intro"&&<Button variant="ghost" aria-label="Avbryt test" onClick={()=>setConfirmExit(true)} className={`fixed left-3 top-[max(10px,env(safe-area-inset-top))] z-[130] h-11 w-11 rounded-full p-0 ${view==="countdown"||view==="compiling"?"text-white":"text-slate-700"}`}><ArrowLeft/></Button>}
 <Dialog open={confirmExit} onOpenChange={setConfirmExit}><DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6"><DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle><DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription><Button onClick={abort} className="min-h-12 rounded-xl bg-slate-950 text-white">Avbryt test</Button><Button variant="outline" onClick={()=>setConfirmExit(false)} className="min-h-12 rounded-xl">Fortsätt testet</Button></DialogContent></Dialog>
