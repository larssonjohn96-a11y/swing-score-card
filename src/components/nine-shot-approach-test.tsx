import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RotateCcw, Star, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EXTENDED_PRECISION_TARGETS, emptyPrecisionShots, precisionResult, summarize, type PrecisionShot } from "@/lib/precision";
import { loadPrecisionSessions, savePrecisionSession, type PrecisionSession } from "@/lib/precision-store";
import { handicapLabel } from "@/lib/shortgame";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { StandardHcpAnalysis } from "@/components/standard-hcp-analysis";
import { ChipCelebration } from "@/components/chip-celebration";
import { HcpCountdownScreen } from "@/components/hcp-countdown-screen";
import { HcpTestProgress } from "@/components/hcp-test-progress";
import { useTestViewportLock } from "@/lib/use-test-viewport-lock";
const DEFAULT_TARGETS=[...EXTENDED_PRECISION_TARGETS] as number[],fmt=(n:number)=>n.toFixed(1).replace(".",",");
const HCP_UNLOCK_KEY="sg4-approach-hcp-unlocked-v1";
const loadUnlocked=()=>{if(typeof window==="undefined")return [] as string[];try{const value=JSON.parse(window.localStorage.getItem(HCP_UNLOCK_KEY)??"[]");return Array.isArray(value)?value.filter((id):id is string=>typeof id==="string"):[]}catch{return []}};
const fmtDate=(iso:string)=>new Date(iso).toLocaleDateString("sv-SE",{day:"numeric",month:"short"});
const hcpTone=(hcp:number)=>hcp<0?"text-emerald-700":hcp<10?"text-emerald-600":hcp<20?"text-emerald-500":hcp<30?"text-amber-500":"text-slate-400";
type ApproachGrade="exceptionellt"|"utmärkt"|"bra"|"förväntat"|"svagt"|"stort tapp";
const approachGrade=(pct:number):ApproachGrade=>pct<=3?"exceptionellt":pct<=5?"utmärkt":pct<=8?"bra":pct<=12?"förväntat":pct<=18?"svagt":"stort tapp";
const GRADE_ROWS:{grade:ApproachGrade;label:string;row:string;text:string}[]=[
 {grade:"exceptionellt",label:"Exceptionellt",row:"bg-emerald-50",text:"text-teal-700"},
 {grade:"utmärkt",label:"Utmärkt",row:"bg-blue-50",text:"text-blue-700"},
 {grade:"bra",label:"Bra",row:"bg-emerald-50",text:"text-emerald-700"},
 {grade:"förväntat",label:"Förväntat",row:"bg-slate-100",text:"text-slate-600"},
 {grade:"svagt",label:"Svagt",row:"bg-orange-50",text:"text-orange-700"},
 {grade:"stort tapp",label:"Stort tapp",row:"bg-rose-50",text:"text-rose-700"},
];
function positiveShotBadge(shots:PrecisionShot[]){
 const filled=shots.filter(s=>s.filled);
 const grades=filled.map(shot=>approachGrade(Math.hypot(shot.carry-shot.target,shot.offline)/shot.target*100));
 const priority:{grade:ApproachGrade;singular:string;plural:string;className:string}[]=[
  {grade:"exceptionellt",singular:"exceptionellt",plural:"exceptionella",className:"bg-emerald-50 text-teal-700"},
  {grade:"utmärkt",singular:"utmärkt",plural:"utmärkta",className:"bg-blue-50 text-blue-700"},
  {grade:"bra",singular:"bra",plural:"bra",className:"bg-emerald-50 text-emerald-700"},
 ];
 for(const item of priority){
  const count=grades.filter(g=>g===item.grade).length;
  if(count)return {text:`${count} ${count===1?item.singular:item.plural} slag`,className:item.className};
 }
 return null;
}
function ApproachCategorization({shots}:{shots:PrecisionShot[]}){
 const counts=GRADE_ROWS.map(item=>({ ...item,count:shots.filter(shot=>{const proximity=Math.hypot(shot.carry-shot.target,shot.offline);return approachGrade(proximity/shot.target*100)===item.grade}).length}));
 return <section className="w-full rounded-[28px] bg-white p-5 text-slate-950 shadow-sm"><h2 className="text-3xl font-black">Kategorisering</h2><div className="mt-5 grid grid-cols-[1fr_56px] px-4 text-sm font-black"><span>Slag</span><span className="text-center">Antal</span></div><div className="mt-3 space-y-2.5">{counts.map(item=><div key={item.grade} className={`grid min-h-14 grid-cols-[1fr_56px] items-center rounded-2xl px-4 ${item.row}`}><span className={`text-[16px] font-medium ${item.text}`}>{item.label}</span><strong className={`text-center text-xl font-black ${item.text}`}>{item.count}</strong></div>)}</div></section>
}
function erfApprox(x:number){const sign=x<0?-1:1,ax=Math.abs(x),a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911,t=1/(1+p*ax),y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax));return sign*y}
const topShare=(hcp:number)=>{const worse=1-.5*(1+erfApprox((hcp-17)/(8*Math.SQRT2)));const betterThan=Math.max(1,Math.min(99,Math.round(worse*100)));return Math.max(1,100-betterThan)};
function ApproachPyramid({hcp}:{hcp:number}){
 const topPct=topShare(hcp);
 const active=topPct<=1?1:topPct<=3?3:topPct<=5?5:topPct<=10?10:topPct<=25?25:topPct<=50?50:100;
 const levels=[{pct:1,label:"Top 1%",w:"w-[32%]"},{pct:3,label:"Top 3%",w:"w-[44%]"},{pct:5,label:"Top 5%",w:"w-[54%]"},{pct:10,label:"Top 10%",w:"w-[66%]"},{pct:25,label:"Top 25%",w:"w-[80%]"},{pct:50,label:"Top 50%",w:"w-[92%]"},{pct:100,label:"Alla golfare",w:"w-full"}];
 return <section className="w-full text-center"><p className="text-sm font-bold uppercase tracking-widest text-blue-100">Var du ligger</p><h2 className="mt-3 text-3xl font-black">Din nivå bland golfare</h2><div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-1.5">{levels.map(level=>{const selected=level.pct===active;return <div key={level.pct} className={`${level.w} flex min-h-10 items-center justify-center rounded-xl border font-black transition-all ${selected?"scale-[1.03] border-white bg-white text-blue-700 shadow-lg":"border-white/15 bg-white/10 text-white/75"}`}>{level.label}{selected?<span className="ml-2 text-xs font-bold">← Du</span>:null}</div>})}</div></section>
}
function BestShotHcpReveal({hcp,target,proximity}:{hcp:number;target:number;proximity:number}){
 const phrase="Ditt bästa slag";
 const [typed,setTyped]=useState(""),[display,setDisplay]=useState(40),[ready,setReady]=useState(false);
 useEffect(()=>{
  setTyped("");setDisplay(40);setReady(false);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){setTyped(phrase);setDisplay(hcp);setReady(true);return}
  const timers:number[]=[];
  phrase.split("").forEach((_,i)=>timers.push(window.setTimeout(()=>setTyped(phrase.slice(0,i+1)),55*i)));
  const revealDelay=phrase.length*55+250;
  timers.push(window.setTimeout(()=>{
    const start=performance.now(),duration=2300;
    let raf=0;
    const tick=(now:number)=>{
      const p=Math.min(1,(now-start)/duration);
      const ease=1-Math.pow(1-p,3);
      const oscillation=Math.sin(p*Math.PI*10)*8*(1-p);
      const next=40+(hcp-40)*ease+oscillation;
      setDisplay(Math.max(-6,Math.min(40,next)));
      if(p<1)raf=requestAnimationFrame(tick);else{setDisplay(hcp);setReady(true)}
    };
    raf=requestAnimationFrame(tick);
    timers.push(raf);
  },revealDelay));
  return()=>timers.forEach(id=>{window.clearTimeout(id);cancelAnimationFrame(id)});
 },[hcp]);
 return <section className="relative text-center">{ready&&<ChipCelebration grand/>}<p className="min-h-6 text-sm font-bold uppercase tracking-widest text-blue-100">{typed}<span className={ready?"opacity-0":"opacity-70"}>|</span></p><h2 className="mt-4 text-3xl font-black">HCP-nivå på ditt bästa slag</h2><div className={`my-7 text-7xl font-black tabular-nums transition-transform duration-200 ${ready?"scale-100":"scale-[1.03]"}`}>{handicapLabel(Math.round(display*10)/10)}</div><p className="text-blue-100">{target} m · {fmt(proximity)} m från flaggan</p></section>
}

export function NineShotApproachTest({
  onExit,
  targets=DEFAULT_TARGETS,
  testTitle="Inspel totalt",
  modeKey="total",
  modeOptions,
  onModeChange,
}:{
  onExit:()=>void;
  targets?:readonly number[];
  testTitle?:string;
  modeKey?:"total"|"short"|"medium"|"long";
  modeOptions?:Array<{mode:"total"|"short"|"medium"|"long";label:string;range:string}>;
  onModeChange?:(mode:"total"|"short"|"medium"|"long")=>void;
}){
 const TARGETS=[...targets] as number[],totalShots=TARGETS.length,rangeLabel=`${Math.min(...TARGETS)}–${Math.max(...TARGETS)} m`;
 const [view,setView]=useState<"intro"|"countdown"|"test"|"compiling"|"result">("intro"),[shots,setShots]=useState<PrecisionShot[]>(()=>emptyPrecisionShots(TARGETS,1)),[index,setIndex]=useState(0);
 const [registeredIndex,setRegisteredIndex]=useState<number|null>(null);
 const [carry,setCarry]=useState(TARGETS[0]),[offline,setOffline]=useState(0),[side,setSide]=useState<-1|1>(1),[carryTouched,setCarryTouched]=useState(false),[offlineTouched,setOfflineTouched]=useState(false),[compile,setCompile]=useState(0),[confirmExit,setConfirmExit]=useState(false),[analysis,setAnalysis]=useState(false),[analysisSession,setAnalysisSession]=useState<PrecisionSession|null>(null),[lastSession,setLastSession]=useState<PrecisionSession|null>(null),[unlocked,setUnlocked]=useState<string[]>(loadUnlocked),[historyLimit,setHistoryLimit]=useState(10); const timers=useRef<number[]>([]);
 useChipScreenColor(view==="countdown"||view==="compiling"||analysis);
 useEffect(()=>{document.documentElement.dataset.sg4TestActive=view==="intro"||view==="result"?"false":"true";return()=>{delete document.documentElement.dataset.sg4TestActive}},[view]);
 useTestViewportLock(view==="test");
 useEffect(()=>{if(registeredIndex===null)return;const id=window.setTimeout(()=>setRegisteredIndex(null),1100);return()=>window.clearTimeout(id)},[registeredIndex]);
 useEffect(()=>{const handler=()=>setConfirmExit(true);window.addEventListener("sg4-test-abort",handler);return()=>window.removeEventListener("sg4-test-abort",handler)},[]); const filled=shots.filter(s=>s.filled),result=useMemo(()=>filled.length===totalShots?precisionResult(shots):null,[shots,filled.length,totalShots]),summary=useMemo(()=>filled.length?summarize(filled):null,[filled]);
 const sessions=(typeof window==="undefined"?[]:loadPrecisionSessions()).filter(s=>(modeKey==="total"?(!s.note||s.note==="hcp:total"):s.note===`hcp:${modeKey}`)&&s.shots.length===TARGETS.length&&s.shots.every((shot,i)=>shot.target===TARGETS[i]));
 const latestSession=sessions.at(-1)??null;
 const recentFive=sessions.slice(-5),recentFiveAvg=recentFive.length?recentFive.reduce((sum,s)=>sum+s.avgProximity,0)/recentFive.length:null;
 const latestTen=sessions.slice(-10);
 const topResultCount=latestTen.length<5?1:latestTen.length<8?2:3;
 const topResultIds=new Set([...latestTen].sort((a,b)=>a.avgProximity-b.avgProximity).slice(0,topResultCount).map(s=>s.id));
 const historyRows=[...sessions].reverse(),visibleHistoryRows=historyRows.slice(0,historyLimit);
 const clear=()=>{timers.current.forEach(window.clearTimeout);timers.current=[]};useEffect(()=>clear,[]);
 useEffect(()=>{if(view!=="compiling")return;setCompile(0);clear();timers.current=[window.setTimeout(()=>setCompile(1),850),window.setTimeout(()=>setCompile(2),1750),window.setTimeout(()=>setCompile(3),2650),window.setTimeout(()=>setView("result"),3400)];return clear},[view]);
 function start(){const fresh=emptyPrecisionShots(TARGETS,1);setShots(fresh);setIndex(0);setCarry(TARGETS[0]);setOffline(0);setSide(1);setCarryTouched(false);setOfflineTouched(false);setRegisteredIndex(null);setLastSession(null);setView("countdown")}
 function add(){const current=shots[index],nextShots=shots.map((s,i)=>i===index?{...s,carry,offline:offline*side,filled:true}:s);setShots(nextShots);setRegisteredIndex(index+1);if(index===totalShots-1){const saved=savePrecisionSession(nextShots,undefined,undefined,`hcp:${modeKey}`);setLastSession(saved);setView("compiling")}else{const n=index+1;setIndex(n);setCarry(TARGETS[n]);setOffline(0);setSide(1);setCarryTouched(false);setOfflineTouched(false)}}
 function undo(){if(index===0)return;const n=index-1,s=shots[n];setShots(a=>a.map((x,i)=>i===n?{...x,filled:false}:x));setIndex(n);setCarry(s.carry||s.target);setOffline(Math.abs(s.offline));setSide(s.offline<0?-1:1);setCarryTouched(true);setOfflineTouched(true);setRegisteredIndex(null)}
 function abort(){clear();setConfirmExit(false);onExit()}
 function openAnalysis(session:PrecisionSession){setAnalysisSession(session);setUnlocked(current=>{if(current.includes(session.id))return current;const next=[...current,session.id];window.localStorage.setItem(HCP_UNLOCK_KEY,JSON.stringify(next));return next});setAnalysis(true)}
 const target=TARGETS[index];
 const analysisShots=analysisSession?.shots??shots,analysisFilled=analysisShots.filter(s=>s.filled),analysisResult=analysisFilled.length?precisionResult(analysisShots):result;
 return <main className={`mx-auto max-w-md bg-slate-50 px-4 pt-4 text-slate-950 ${view==="test"?"h-[calc(100dvh-58px)] overflow-hidden pb-28":"min-h-[calc(100dvh-58px)] pb-[max(24px,env(safe-area-inset-bottom))]"}`}>
 <style>{`@keyframes aSheen{0%{transform:translateX(-140%);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(260%);opacity:0}}.a-sheen{opacity:0;animation:aSheen 1.15s ease .2s 1}@media(prefers-reduced-motion:reduce){.a-sheen{animation:none!important}}`}</style>
 <Dialog open={confirmExit} onOpenChange={setConfirmExit}><DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6"><DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle><DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription><Button onClick={abort} className="min-h-12 rounded-xl bg-slate-950 text-white">Avbryt test</Button><Button variant="outline" onClick={()=>setConfirmExit(false)} className="min-h-12 rounded-xl">Fortsätt testet</Button></DialogContent></Dialog>
 {view==="intro"?<div className="space-y-4"><section className="text-center"><h1 className="text-4xl font-black">Inspelstest {rangeLabel}</h1><p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{totalShots} slag. Ett slag från varje mål.</p></section>{modeOptions?.length?<section className="rounded-2xl border border-slate-200 bg-white p-1.5"><div className="grid grid-cols-4 gap-1">{modeOptions.map(option=><button key={option.mode} type="button" onClick={()=>onModeChange?.(option.mode)} className={`min-w-0 rounded-xl px-1 py-2.5 text-[11px] font-black ${option.mode===modeKey?"bg-blue-600 text-white":"text-slate-500"}`}><span className="block truncate">{option.label}</span><span className={`mt-0.5 block text-[9px] font-semibold ${option.mode===modeKey?"text-blue-100":"text-slate-400"}`}>{option.range}</span></button>)}</div></section>:null}<section className="rounded-3xl border border-blue-100 bg-white px-3 pb-5 pt-4 shadow-sm"><img src="/Approach_shot.png" alt="" className="mb-4 h-52 w-full rounded-2xl object-cover"/><Button onClick={start} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">Starta test</Button></section>{sessions.length?<><section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Din nivå</h2><span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{sessions.length} test</span></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-3xl font-black text-slate-950">{recentFiveAvg!==null?`${fmt(recentFiveAvg)} m`:"–"}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Senaste 5</p></div><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-3xl font-black text-slate-950">{latestSession?`${fmt(latestSession.avgProximity)} m`:"–"}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Senaste test</p></div></div><p className="mt-3 text-center text-[11px] font-semibold text-slate-400">Snitt från flaggan</p></section><section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-blue-100 p-4"><div><h2 className="text-lg font-black">Historik</h2><p className="text-sm text-slate-500">Snitt från flaggan · HCP-analys</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{sessions.length}</span></div><div className="grid grid-cols-[66px_1fr_82px] gap-2 border-b border-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-slate-400"><span>Datum</span><span>Resultat</span><span className="text-center">HCP</span></div>{visibleHistoryRows.map(session=>{const rowHcp=session.handicap??precisionResult(session.shots).handicap,isUnlocked=unlocked.includes(session.id),badge=positiveShotBadge(session.shots),isTopResult=topResultIds.has(session.id);return <div key={session.id} className="grid grid-cols-[66px_1fr_82px] items-center gap-2 border-b border-slate-100 px-4 py-3.5 last:border-0"><span className="text-[13px] font-semibold text-slate-500">{fmtDate(session.date)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><strong className="text-[17px] leading-none text-slate-950">{fmt(session.avgProximity)} m</strong>{badge?<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badge.className}`}>{badge.text}</span>:null}{isTopResult?<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Toppresultat</span>:null}</div></div><button type="button" onClick={()=>openAnalysis(session)} aria-label={isUnlocked?"Öppna HCP-analys":"Se HCP-analys"} className={isUnlocked?`mx-auto text-[15px] font-black ${hcpTone(rowHcp)}`:"mx-auto flex min-h-9 items-center justify-center gap-1 rounded-xl bg-blue-600 px-2.5 text-[10px] font-black text-white shadow-sm"}>{isUnlocked?handicapLabel(rowHcp):<><Star className="h-3.5 w-3.5 fill-white/15"/>Analys</>}</button></div>})}{historyRows.length>historyLimit?<button type="button" onClick={()=>setHistoryLimit(limit=>limit+10)} className="w-full border-t border-slate-100 px-4 py-3.5 text-sm font-bold text-slate-600">Se fler</button>:null}</section></>:<section className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-center"><p className="font-bold text-slate-700">Ingen historik ännu</p><p className="mt-1 text-sm text-slate-500">Gör ditt första test för att sätta dina resultat.</p></section>}</div>
 :view==="countdown"?<HcpCountdownScreen label={`${testTitle} · ${totalShots} slag`} onComplete={()=>setView("test")} />
 :view==="test"?<div className="space-y-3"><HcpTestProgress current={index+1} total={totalShots} label="Inspel" /><section><p className="text-center text-xs font-semibold text-slate-500">{testTitle} · {totalShots} slag</p><h1 className="mt-2 text-center text-4xl font-black">Slag {index+1}</h1><p className="mt-3 text-center text-[11px] font-black uppercase tracking-[.16em] text-slate-400">Mål</p><div className="mt-1 flex items-baseline justify-center leading-none"><span className="text-[58px] font-black tracking-[-.03em] text-slate-950">{target}</span><span className="ml-1 text-2xl font-bold text-slate-400">m</span></div>{registeredIndex!==null&&registeredIndex<totalShots?<p className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800"><Check className="h-3.5 w-3.5"/>Slag {registeredIndex} registrerat</p>:null}</section>{index===totalShots-1&&<p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center font-bold text-violet-900">Sista slaget – en chans till att slå ditt rekord!</p>}<section className="rounded-3xl border border-slate-200 bg-white p-4"><label className="block text-center text-lg font-bold text-slate-600">Carry</label><div className="my-4 flex items-baseline justify-center"><input inputMode="decimal" value={carry} onChange={e=>{setCarry(Number(e.target.value)||0);setCarryTouched(true)}} className={`w-32 bg-transparent text-center text-5xl font-black outline-none transition-colors ${carryTouched?"text-slate-700":"text-slate-400"}`}/><span className="text-lg text-slate-400">m</span></div><div className="grid grid-cols-4 gap-2">{[-5,-1,1,5].map(d=><Button key={d} variant="outline" onClick={()=>{setCarry(v=>Math.max(0,v+d));setCarryTouched(true)}} className="bg-white">{d>0?"+":""}{d}</Button>)}</div><div className="my-5 border-t"/><label className="block text-center text-lg font-bold text-slate-600">Sidled från mitten</label><div className="my-4 flex items-baseline justify-center"><span className={`text-4xl font-black transition-colors ${offlineTouched?"text-slate-700":"text-slate-400"}`}>{Math.round(offline)}</span><span className="ml-1 text-sm text-slate-400">m</span></div><div className="mb-2 grid grid-cols-4 gap-2">{[-5,-1,1,5].map(d=><Button key={d} variant="outline" onClick={()=>{setOffline(v=>Math.max(0,Math.min(80,v+d)));setOfflineTouched(true)}} className="bg-white">{d>0?"+":""}{d}</Button>)}</div><div className="grid grid-cols-2 gap-2">{([-1,1] as const).map(v=><Button key={v} variant={side===v?"default":"outline"} onClick={()=>{setSide(v);setOfflineTouched(true)}} className={side===v?"bg-slate-600 text-white":"bg-white"}>{v<0?"Vänster":"Höger"}</Button>)}</div><p className="mt-3 text-center text-xs text-slate-500">Avstånd från mål: {fmt(Math.sqrt((carry-target)**2+offline**2))} m</p><div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-slate-50 via-slate-50/98 to-transparent px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))] pt-7"><div className="mx-auto w-full max-w-md"><p className="mb-2 text-center text-sm text-slate-600">Slaget landade <strong>{Math.round(carry)} m</strong> och <strong>{Math.round(offline)} m {side<0?"vänster":"höger"}</strong> om målet.</p><Button onClick={add} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">Registrera slag</Button></div></div>{index>0&&<Button variant="ghost" onClick={undo} className="mt-1 w-full text-slate-500"><Undo2/>Ändra förra slaget</Button>}</section></div>
 :view==="compiling"?createPortal(<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-700 p-6 text-center text-white"><span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600">{compile>=3?<Check className="h-9 w-9"/>:<LoaderCircle className="h-9 w-9 motion-safe:animate-spin"/>}</span><h1 className="text-3xl font-black">{compile>=3?"Resultatet klart":"Sammanställer testet…"}</h1><div className="mt-6 w-full max-w-xs space-y-4 text-left text-blue-100">{["Sammanställer dina slag","Beräknar snitt från flaggan","Förbereder din HCP-analys"].map((x,i)=><p key={x} className={`flex items-center gap-3 ${i<=compile?"opacity-100":"opacity-0"}`}>{i<compile||compile>=3?<Check className="h-5 w-5"/>:<LoaderCircle className="h-5 w-5 motion-safe:animate-spin"/>}{x}</p>)}</div></div>,document.body)
 :result&&summary&&result?<div className="space-y-4"><section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm"><span className="a-sheen pointer-events-none absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-blue-100/80 to-transparent"/><p className="text-xs font-black uppercase text-slate-400">Ditt resultat</p><h1 className="mt-1 text-2xl font-black">{testTitle} klart</h1><div className="mt-5 rounded-2xl bg-slate-50 p-6"><p className="text-6xl font-black text-slate-950">{fmt(summary.avgProximity)} m</p><p className="mt-2 text-sm font-semibold text-slate-500">Snitt från flaggan</p></div></section><Button disabled={!lastSession} onClick={()=>lastSession&&openAnalysis(lastSession)} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">Visa min HCP-analys</Button><Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-white"><RotateCcw/>Testa igen · {totalShots} slag</Button><Button variant="outline" onClick={onExit} className="min-h-14 w-full rounded-2xl border-slate-200 bg-white text-slate-900"><ArrowLeft/>Tillbaka till HCP-tester</Button></div>:null}
 <Dialog open={analysis} onOpenChange={setAnalysis}><DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white"><DialogTitle className="sr-only">{testTitle} HCP-analys</DialogTitle><DialogDescription className="sr-only">Ditt estimerade Approach-HCP.</DialogDescription>{analysisResult?<StandardHcpAnalysis title={`${testTitle} HCP-analys`} hcp={analysisResult.handicap} onClose={()=>setAnalysis(false)} slides={[
 {key:"categories",content:<ApproachCategorization shots={analysisFilled}/>},
 {key:"pyramid",content:<ApproachPyramid hcp={analysisResult.handicap}/>},
 {key:"best",content:(()=>{const best=[...analysisFilled].sort((a,b)=>Math.hypot(a.carry-a.target,a.offline)-Math.hypot(b.carry-b.target,b.offline))[0];const proximity=best?Math.hypot(best.carry-best.target,best.offline):0;const bestHcp=best?Math.max(-6,Math.min(36,((proximity/best.target*100)-6.7)*2.2)):0;return <BestShotHcpReveal hcp={bestHcp} target={best?.target??0} proximity={proximity}/>})()}
]} />:null}</DialogContent></Dialog>
 </main>
}