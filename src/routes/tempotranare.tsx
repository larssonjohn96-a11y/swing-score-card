import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";

type Mode = "full" | "short" | "putt";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
const presets = [30,27,24,21,18];
const storeKey = "sg4-tempo-settings";
type Settings = { mode:Mode; frames:number; delay:number; gap:number; reps:number; volume:number; sound:"wood"|"digital" };
const defaults:Settings = {mode:"full",frames:24,delay:3,gap:5,reps:10,volume:.65,sound:"wood"};
function load():Settings {
  try { return {...defaults,...JSON.parse(localStorage.getItem(storeKey)||"{}")}; } catch { return defaults; }
}
function TempoPage() {
  const [settings,setSettings]=useState<Settings>(defaults);
  const [ready,setReady]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [count,setCount]=useState(0);
  const [stage,setStage]=useState("Redo");
  const context=useRef<AudioContext|null>(null);
  const sources=useRef<OscillatorNode[]>([]);
  const timers=useRef<number[]>([]);
  const run=useRef(0);
  const awake=useRef<{release:()=>Promise<void>}|null>(null);
  useEffect(()=>{setSettings(load());setReady(true);},[]);
  useEffect(()=>{if(ready)localStorage.setItem(storeKey,JSON.stringify(settings));},[settings,ready]);
  const change=<K extends keyof Settings>(key:K,value:Settings[K])=>setSettings(s=>({...s,[key]:value}));
  const ratio=settings.mode==="full"?3:2;
  const back=settings.frames/30;
  const down=back/ratio;
  const total=back+down;
  const clear=()=>{
    run.current++;
    timers.current.forEach(window.clearTimeout);timers.current=[];
    sources.current.forEach(o=>{try{o.stop();}catch{}});sources.current=[];
    void awake.current?.release().catch(()=>{});awake.current=null;
    setPlaying(false);setStage("Redo");
  };
  useEffect(()=>()=>{run.current++;timers.current.forEach(window.clearTimeout);sources.current.forEach(o=>{try{o.stop();}catch{}});void context.current?.close();void awake.current?.release().catch(()=>{});},[]);
  const later=(fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms));};
  const tone=(ctx:AudioContext,time:number,frequency:number,index:number)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=settings.sound==="wood"?"sine":"triangle";
    osc.frequency.setValueAtTime(frequency,time);
    if(settings.sound==="wood")osc.frequency.exponentialRampToValueAtTime(frequency*.7,time+.055);
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,settings.volume*.22),time+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,time+(index===2?.17:.095));
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(time);osc.stop(time+(index===2?.19:.11));
    sources.current.push(osc);
    osc.onended=()=>{sources.current=sources.current.filter(item=>item!==osc);};
  };
  const start=async(test=false)=>{
    clear();
    const Ctor=window.AudioContext||(window as AudioWindow).webkitAudioContext;
    if(!Ctor){setStage("Ljud stöds inte");return;}
    const ctx=context.current??new Ctor();context.current=ctx;
    try{await ctx.resume();}catch{setStage("Tryck igen för ljud");return;}
    if(test){const now=ctx.currentTime+.08;[0,back,total].forEach((t,i)=>tone(ctx,now+t,[620,430,850][i],i));setStage("Ljudtest");later(()=>setStage("Redo"),(total+.5)*1000);return;}
    const token=run.current;
    setCount(0);setPlaying(true);
    try {
      const nav=navigator as Navigator & {wakeLock?:{request:(type:"screen")=>Promise<{release:()=>Promise<void>}>}};
      if(nav.wakeLock)awake.current=await nav.wakeLock.request("screen");
    }catch{}
    if(token!==run.current)return;
    const begin=ctx.currentTime+.12+settings.delay;
    const cycle=total+settings.gap;
    const repetitions=settings.reps===0?1000:settings.reps;
    // Schedule a short rolling audio horizon to avoid long-running oscillator queues.
    let next=0;
    const schedule=()=>{
      if(token!==run.current)return;
      while(next<repetitions && begin+next*cycle<ctx.currentTime+8){
        const i=next++, t=begin+i*cycle;
        [0,back,total].forEach((offset,j)=>tone(ctx,t+offset,[620,430,850][j],j));
        const delay=Math.max(0,(t-ctx.currentTime)*1000);
        later(()=>{if(token===run.current){setCount(i);setStage("Baksving");}},delay);
        later(()=>{if(token===run.current)setStage("Nedsving");},delay+back*1000);
        later(()=>{if(token===run.current)setStage("Träff");},delay+total*1000);
      }
      if(next<repetitions)later(schedule,2000);
    };
    setStage("Förbered dig");
    schedule();
    if(settings.reps!==0)later(()=>{if(token===run.current){clear();setStage("Klart!");setCount(repetitions);}},(settings.delay+repetitions*cycle-settings.gap+.35)*1000);
  };
  return <main className="mx-auto min-h-screen max-w-md bg-[#f7f9fd] px-5 pb-32 pt-6 text-slate-950">
    
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">SG4 · Träningsverktyg</p>
    <h1 className="mt-1 font-display text-[40px]">Tempoträning</h1>
    <p className="mt-2 text-sm text-slate-500">Tre ljudsignaler för en jämnare sving. Start · Vändning · Träff.</p>
    <div className="mt-6 grid grid-cols-3 gap-2">{([{id:"full",name:"Full sving"},{id:"short",name:"Närspel"},{id:"putt",name:"Puttning"}] as const).map(x=><button key={x.id} disabled={playing} onClick={()=>change("mode",x.id)} className={`rounded-2xl px-2 py-4 text-sm font-black ${settings.mode===x.id?"bg-blue-600 text-white":"bg-slate-100"}`}>{x.name}</button>)}</div>
    <div className="mt-5 rounded-[2rem] bg-slate-100 px-5 py-7 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Svingförhållande</p>
      <p className="mt-2 text-6xl font-black">{ratio}:1</p>
      <p className="mt-3 text-sm text-slate-500">Baksving {back.toFixed(2)} s · Nedsving {down.toFixed(2)} s</p>
      <div className="mt-6 grid grid-cols-3 gap-2">{["Start","Vändning","Träff"].map((label,i)=><div key={label} className={`rounded-2xl px-1 py-4 text-xs font-black ${stage===["Baksving","Nedsving","Träff"][i]?"bg-blue-600 text-white":"bg-white"}`}>{label}</div>)}</div>
      <p aria-live="polite" className="mt-5 text-xl font-black">{stage}</p>
      <p className="mt-1 text-sm text-slate-500">{count} {settings.reps?"/ "+settings.reps:"repetitioner"}</p>
    </div>
    <section className="mt-6 space-y-5">
      <div><label className="mb-2 block text-sm font-black">Hastighet</label><div className="grid grid-cols-5 gap-2">{presets.map(p=><button key={p} disabled={playing} onClick={()=>change("frames",p)} className={`rounded-xl py-3 text-sm font-black ${settings.frames===p?"bg-blue-600 text-white":"bg-slate-100"}`}>{p}/{Math.round(p/ratio)}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">Startfördröjning<select disabled={playing} value={settings.delay} onChange={e=>change("delay",Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-100 p-3">{[3,5,10].map(x=><option key={x} value={x}>{x} sekunder</option>)}</select></label>
        <label className="text-sm font-bold">Paus mellan slag<select disabled={playing} value={settings.gap} onChange={e=>change("gap",Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-100 p-3">{[3,5,8,10].map(x=><option key={x} value={x}>{x} sekunder</option>)}</select></label>
        <label className="text-sm font-bold">Repetitioner<select disabled={playing} value={settings.reps} onChange={e=>change("reps",Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-100 p-3">{[5,10,20,0].map(x=><option key={x} value={x}>{x||"Obegränsat"}</option>)}</select></label>
        <label className="text-sm font-bold">Ljud<select disabled={playing} value={settings.sound} onChange={e=>change("sound",e.target.value as Settings["sound"])} className="mt-2 w-full rounded-xl bg-slate-100 p-3"><option value="wood">Mjukt tick/tock/ping</option><option value="digital">Elektroniskt</option></select></label>
      </div>
      <label className="block text-sm font-bold">Volym <span className="float-right">{Math.round(settings.volume*100)}%</span><input className="mt-3 w-full accent-blue-600" type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e=>change("volume",Number(e.target.value))}/></label>
    </section>
    <div className="mt-7 flex gap-3"><button onClick={()=>playing?clear():void start()} className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-lg font-black text-white">{playing?<Pause/>:<Play/>}{playing?"Stoppa":"Starta"}</button><button aria-label="Återställ tempoträning" onClick={()=>{clear();setCount(0);}} className="rounded-2xl bg-slate-100 px-5"><RotateCcw/></button></div>
    <button disabled={playing} onClick={()=>void start(true)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold"><Volume2 className="h-4 w-4"/>Testa ljud</button>
    <p className="mt-4 text-xs text-slate-500">Håll skärmen aktiv under träningen. Bluetooth-hörlurar kan ge ljudfördröjning. Detta tränar tempo men mäter inte din faktiska sving.</p>
  </main>;
}

export const Route = createFileRoute("/tempotranare")({
  head: () => ({meta: [{title: "Tempoträning – SG4"}, {name: "description", content: "Träna svingtempo med tre ljudsignaler."}]}),
  component: TempoPage,
});
