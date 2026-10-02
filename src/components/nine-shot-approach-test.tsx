import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Minus, Plus, RotateCcw, Star, Undo2 } from "lucide-react";
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
 {grade:"förväntat",label:"Godkänt",row:"bg-slate-100",text:"text-slate-600"},
 {grade:"svagt",label:"Svagt",row:"bg-orange-50",text:"text-orange-700"},
 {grade:"stort tapp",label:"Kostsam miss",row:"bg-rose-50",text:"text-rose-700"},
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
 return <section className="w-full rounded-[28px] bg-white p-5 text-slate-950 shadow-sm">
  <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Dina 9 slag</p>
  <h2 className="mt-2 text-3xl font-black">Bedömning av dina slag</h2>
  <p className="mt-2 text-sm leading-relaxed text-slate-500">Varje slag bedöms efter hur stor missen var i förhållande till målavståndet.</p>
  <div className="mt-5 grid grid-cols-[1fr_56px] px-4 text-sm font-black"><span>Nivå</span><span className="text-center">Antal</span></div>
  <div className="mt-3 space-y-2.5">{counts.map(item=><div key={item.grade} className={`grid min-h-14 grid-cols-[1fr_56px] items-center rounded-2xl px-4 ${item.row}`}><span className={`text-[16px] font-medium ${item.text}`}>{item.label}</span><strong className={`text-center text-xl font-black ${item.text}`}>{item.count}</strong></div>)}</div>
 </section>
}
function erfApprox(x:number){const sign=x<0?-1:1,ax=Math.abs(x),a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911,t=1/(1+p*ax),y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax));return sign*y}
const topShare=(hcp:number)=>{const worse=1-.5*(1+erfApprox((hcp-17)/(8*Math.SQRT2)));const betterThan=Math.max(1,Math.min(99,Math.round(worse*100)));return Math.max(1,100-betterThan)};
function ApproachPyramid({hcp}:{hcp:number}){
 const topPct=topShare(hcp);
 const active=topPct<=1?1:topPct<=3?3:topPct<=5?5:topPct<=10?10:topPct<=25?25:topPct<=50?50:100;
 const levels=[{pct:1,label:"Topp 1 %"},{pct:3,label:"Topp 3 %"},{pct:5,label:"Topp 5 %"},{pct:10,label:"Topp 10 %"},{pct:25,label:"Topp 25 %"},{pct:50,label:"Topp 50 %"},{pct:100,label:"Alla golfare"}];
 const activeIndex=Math.max(0,levels.findIndex(level=>level.pct===active));
 return <section className="relative w-full rounded-3xl border border-violet-200 bg-violet-50 p-5 text-slate-950 shadow-sm">
  <ChipCelebration confettiOnly/>
  <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Din ranking</p>
  <h2 className="mt-2 text-3xl font-black">Din nivå bland golfare</h2>
  <p className="mt-2 text-sm text-slate-500">Den blå delen visar var din nivå ligger.</p>
  <svg viewBox={`0 0 340 ${levels.length*42+12}`} className="mx-auto mt-5 w-full max-w-xs" role="img" aria-label={`Din nivå: ${levels[activeIndex].label}`}>
   {levels.map((level,i)=>{
    const y1=6+i*42,y2=y1+37,top=i*(84/levels.length),bottom=(i+1)*(84/levels.length);
    const lit=i<=activeIndex,current=i===activeIndex;
    return <g key={level.pct}>
      <polygon points={`${96-top},${y1} ${96+top},${y1} ${96+bottom},${y2} ${96-bottom},${y2}`} fill={lit?"#1558ff":"#eef1f5"} stroke={lit?"#1558ff":"#dce2ea"} strokeWidth="1"/>
      <text x="198" y={y1+26} fontSize="14" fontWeight={current?"800":"600"} fill={current?"#1558ff":lit?"#334155":"#64748b"}>{level.label}{current?" · Du":""}</text>
    </g>
   })}
  </svg>
 </section>
}
function BestShotHcpReveal({hcp}:{hcp:number}){
 const phrase="Ditt bästa slag i testet motsvarade en HCP-nivå på";
 const [typed,setTyped]=useState(""),[display,setDisplay]=useState(40),[ready,setReady]=useState(false);
 useEffect(()=>{
  setTyped("");setDisplay(40);setReady(false);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){setTyped(phrase);setDisplay(hcp);setReady(true);return}
  const timers:number[]=[];
  phrase.split("").forEach((_,i)=>timers.push(window.setTimeout(()=>setTyped(phrase.slice(0,i+1)),42*i)));
  const revealDelay=phrase.length*42+300;
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
 return <section className="relative text-center">{ready&&<ChipCelebration grand/>}<h2 className="mx-auto min-h-[110px] max-w-sm text-3xl font-black leading-tight">{typed}<span className={ready?"opacity-0":"opacity-70"}>|</span></h2><div className={`mt-7 text-[clamp(88px,27vw,132px)] font-black tabular-nums transition-transform duration-200 ${ready?"scale-100":"scale-[1.03]"}`}>{handicapLabel(Math.round(display*10)/10)}</div></section>
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
 const [registeredShot,setRegisteredShot]=useState<{number:number;carry:number;offline:number;side:-1|1|null;target:number}|null>(null);
 const [carry,setCarry]=useState(TARGETS[0]),[offline,setOffline]=useState(0),[side,setSide]=useState<-1|1|null>(null),[carryTouched,setCarryTouched]=useState(false),[offlineTouched,setOfflineTouched]=useState(false),[compile,setCompile]=useState(0),[confirmExit,setConfirmExit]=useState(false),[analysis,setAnalysis]=useState(false),[analysisSession,setAnalysisSession]=useState<PrecisionSession|null>(null),[lastSession,setLastSession]=useState<PrecisionSession|null>(null),[unlocked,setUnlocked]=useState<string[]>(loadUnlocked),[historyLimit,setHistoryLimit]=useState(10); const timers=useRef<number[]>([]);
 useChipScreenColor(view==="countdown"||view==="compiling"||analysis);
 useEffect(()=>{document.documentElement.dataset.sg4TestActive=view==="intro"||view==="result"?"false":"true";return()=>{delete document.documentElement.dataset.sg4TestActive}},[view]);
 useTestViewportLock(view==="test");
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
 function start(){const fresh=emptyPrecisionShots(TARGETS,1);setShots(fresh);setIndex(0);setCarry(TARGETS[0]);setOffline(0);setSide(null);setCarryTouched(false);setOfflineTouched(false);setRegisteredShot(null);setLastSession(null);setView("countdown")}
 function add(){const current=shots[index],resolvedSide=side??1,nextShots=shots.map((s,i)=>i===index?{...s,carry,offline:offline===0?0:offline*resolvedSide,filled:true}:s);setShots(nextShots);if(index===totalShots-1){const saved=savePrecisionSession(nextShots,undefined,undefined,`hcp:${modeKey}`);setLastSession(saved)}setRegisteredShot({number:index+1,carry,offline,side,target:current.target})}
 function continueAfterRegistered(){if(!registeredShot)return;setRegisteredShot(null);if(index===totalShots-1){setView("compiling");return}const n=index+1;setIndex(n);setCarry(TARGETS[n]);setOffline(0);setSide(null);setCarryTouched(false);setOfflineTouched(false)}
 function undo(){if(index===0)return;const n=index-1,s=shots[n];setShots(a=>a.map((x,i)=>i===n?{...x,filled:false}:x));setIndex(n);setCarry(s.carry||s.target);setOffline(Math.abs(s.offline));setSide(s.offline<0?-1:s.offline>0?1:null);setCarryTouched(true);setOfflineTouched(true);setRegisteredShot(null)}
 function abort(){clear();setConfirmExit(false);onExit()}
 function openAnalysis(session:PrecisionSession){setAnalysisSession(session);setUnlocked(current=>{if(current.includes(session.id))return current;const next=[...current,session.id];window.localStorage.setItem(HCP_UNLOCK_KEY,JSON.stringify(next));return next});setAnalysis(true)}
 const target=TARGETS[index];
 const analysisShots=analysisSession?.shots??shots,analysisFilled=analysisShots.filter(s=>s.filled),analysisResult=analysisFilled.length?precisionResult(analysisShots):result;
 return <main className={`mx-auto max-w-md bg-slate-50 px-4 pt-4 text-slate-950 ${view==="test"?"h-[calc(100dvh-58px)] overflow-hidden pb-28":"min-h-[calc(100dvh-58px)] pb-[max(24px,env(safe-area-inset-bottom))]"}`}>
 <style>{`@keyframes aSheen{0%{transform:translateX(-140%);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(260%);opacity:0}}.a-sheen{opacity:0;animation:aSheen 1.15s ease .2s 1}@media(prefers-reduced-motion:reduce){.a-sheen{animation:none!important}}`}</style>
 <Dialog open={confirmExit} onOpenChange={setConfirmExit}><DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6"><DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle><DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription><Button onClick={abort} className="min-h-12 rounded-xl bg-slate-950 text-white">Avbryt test</Button><Button variant="outline" onClick={()=>setConfirmExit(false)} className="min-h-12 rounded-xl">Fortsätt testet</Button></DialogContent></Dialog>
 {registeredShot?<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/25 px-6 backdrop-blur-[2px]"><section className="w-full max-w-sm rounded-[30px] bg-white p-6 text-center text-slate-950 shadow-2xl"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-7 w-7"/></span><p className="mt-4 text-[11px] font-black uppercase tracking-[.18em] text-emerald-700">Registrerat</p><h2 className="mt-1 text-3xl font-black">Slag {registeredShot.number}</h2><p className="mt-3 text-sm text-slate-500">{registeredShot.carry} m carry · {registeredShot.offline===0?"mittlinje":`${Math.round(registeredShot.offline)} m ${registeredShot.side===-1?"vänster":"höger"}`}</p><Button onClick={continueAfterRegistered} className="mt-6 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">{index===totalShots-1?"Sammanställ resultat":"Nästa slag"}<ArrowRight className="ml-2 h-4 w-4"/></Button></section></div>:null}
 {view==="intro"?<div className="space-y-4"><section className="text-center"><h1 className="text-4xl font-black">Inspelstest {rangeLabel}</h1><p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{totalShots} slag. Ett slag från varje mål.</p></section>{modeOptions?.length?<section className="rounded-2xl border border-slate-200 bg-white p-1.5"><div className="grid grid-cols-4 gap-1">{modeOptions.map(option=><button key={option.mode} type="button" onClick={()=>onModeChange?.(option.mode)} className={`min-w-0 rounded-xl px-1 py-2.5 text-[11px] font-black ${option.mode===modeKey?"bg-blue-600 text-white":"text-slate-500"}`}><span className="block truncate">{option.label}</span><span className={`mt-0.5 block text-[9px] font-semibold ${option.mode===modeKey?"text-blue-100":"text-slate-400"}`}>{option.range}</span></button>)}</div></section>:null}<section className="rounded-3xl border border-blue-100 bg-white px-3 pb-5 pt-4 shadow-sm"><img src="/Approach_shot.png" alt="" className="mb-4 h-52 w-full rounded-2xl object-cover"/><Button onClick={start} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">Starta test</Button></section>{sessions.length?<><section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Din nivå</h2><span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{sessions.length} test</span></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-3xl font-black text-slate-950">{recentFiveAvg!==null?`${fmt(recentFiveAvg)} m`:"–"}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Senaste 5</p></div><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-3xl font-black text-slate-950">{latestSession?`${fmt(latestSession.avgProximity)} m`:"–"}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Senaste test</p></div></div><p className="mt-3 text-center text-[11px] font-semibold text-slate-400">Snitt från flaggan</p></section><section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-blue-100 p-4"><div><h2 className="text-lg font-black">Historik</h2><p className="text-sm text-slate-500">Snitt från flaggan · HCP-analys</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{sessions.length}</span></div><div className="grid grid-cols-[66px_1fr_82px] gap-2 border-b border-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-slate-400"><span>Datum</span><span>Resultat</span><span className="text-center">HCP</span></div>{visibleHistoryRows.map(session=>{const rowHcp=session.handicap??precisionResult(session.shots).handicap,isUnlocked=unlocked.includes(session.id),badge=positiveShotBadge(session.shots),isTopResult=topResultIds.has(session.id);return <div key={session.id} className="grid grid-cols-[66px_1fr_82px] items-center gap-2 border-b border-slate-100 px-4 py-3.5 last:border-0"><span className="text-[13px] font-semibold text-slate-500">{fmtDate(session.date)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><strong className="text-[17px] leading-none text-slate-950">{fmt(session.avgProximity)} m</strong>{badge?<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badge.className}`}>{badge.text}</span>:null}{isTopResult?<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Toppresultat</span>:null}</div></div><button type="button" onClick={()=>openAnalysis(session)} aria-label={isUnlocked?"Öppna HCP-analys":"Se HCP-analys"} className={isUnlocked?`mx-auto text-[15px] font-black ${hcpTone(rowHcp)}`:"mx-auto flex min-h-9 items-center justify-center gap-1 rounded-xl bg-blue-600 px-2.5 text-[10px] font-black text-white shadow-sm"}>{isUnlocked?handicapLabel(rowHcp):<><Star className="h-3.5 w-3.5 fill-white/15"/>Analys</>}</button></div>})}{historyRows.length>historyLimit?<button type="button" onClick={()=>setHistoryLimit(limit=>limit+10)} className="w-full border-t border-slate-100 px-4 py-3.5 text-sm font-bold text-slate-600">Se fler</button>:null}</section></>:<section className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-center"><p className="font-bold text-slate-700">Ingen historik ännu</p><p className="mt-1 text-sm text-slate-500">Gör ditt första test för att sätta dina resultat.</p></section>}</div>
 :view==="countdown"?<HcpCountdownScreen label={`${testTitle} · ${totalShots} slag`} onComplete={()=>setView("test")} />
 :view==="test"?<div className="space-y-3"><HcpTestProgress current={index+1} total={totalShots} label="Inspel" /><section><p className="text-center text-xs font-semibold text-slate-500">{testTitle} · {totalShots} slag</p><h1 className="mt-2 text-center text-4xl font-black">Slag {index+1}</h1><p className="mt-3 text-center text-[11px] font-black uppercase tracking-[.16em] text-slate-400">Mål</p><div className="mt-1 flex items-baseline justify-center leading-none"><span className="text-[58px] font-black tracking-[-.03em] text-slate-950">{target}</span><span className="ml-1 text-2xl font-bold text-slate-400">m</span></div></section>{index===totalShots-1&&<p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center font-bold text-violet-900">Sista slaget – en chans till att slå ditt rekord!</p>}<section className="rounded-3xl border border-slate-200 bg-white p-4"><label className="block text-center text-lg font-bold text-slate-600">Carry</label><div className="my-4 flex items-baseline justify-center"><input inputMode="decimal" value={carry} onChange={e=>{setCarry(Number(e.target.value)||0);setCarryTouched(true)}} className={`w-32 bg-transparent text-center text-5xl font-black outline-none transition-colors ${carryTouched?"text-slate-700":"text-slate-400"}`}/><span className="text-lg text-slate-400">m</span></div><div className="grid grid-cols-4 gap-2">{[-5,-1,1,5].map(d=><Button key={d} variant="outline" onClick={()=>{setCarry(v=>Math.max(0,v+d));setCarryTouched(true)}} className="bg-white">{d>0?"+":""}{d}</Button>)}</div><div className="my-5 border-t"/><label className="block text-center text-lg font-bold text-slate-600">Sidled från mitten</label><div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={()=>{setSide(-1);setOfflineTouched(true)}} aria-pressed={side===-1} className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${side===-1?"bg-blue-600 text-white shadow-sm":"text-slate-500"}`}>← Vänster</button><button type="button" onClick={()=>{setSide(1);setOfflineTouched(true)}} aria-pressed={side===1} className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${side===1?"bg-blue-600 text-white shadow-sm":"text-slate-500"}`}>Höger →</button></div><div className="mt-3 flex items-center gap-2"><button type="button" onClick={()=>{setOffline(v=>Math.max(0,v-1));setOfflineTouched(true)}} disabled={offline<=0} aria-label="Minska sidled" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-30"><Minus className="h-4 w-4"/></button><div className="flex flex-1 items-baseline justify-center gap-1"><span className={`text-4xl font-black transition-colors ${offlineTouched?"text-slate-700":"text-slate-400"}`}>{Math.round(offline)}</span><span className="text-sm text-slate-400">m</span></div><button type="button" onClick={()=>{setOffline(v=>Math.min(80,v+1));setOfflineTouched(true)}} aria-label="Öka sidled" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"><Plus className="h-4 w-4"/></button></div><div className="mt-2 grid grid-cols-3 gap-1.5">{[1,5,10].map(d=><button key={d} type="button" onClick={()=>{setOffline(v=>Math.min(80,v+d));setOfflineTouched(true)}} className="rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-500">+{d}</button>)}</div>{offline>0&&side===null?<p className="mt-2 text-center text-xs font-bold text-amber-600">Välj vänster eller höger.</p>:null}<p className="mt-3 text-center text-xs text-slate-500">Avstånd från mål: {fmt(Math.sqrt((carry-target)**2+offline**2))} m</p><div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-slate-50 via-slate-50/98 to-transparent px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))] pt-7"><div className="mx-auto w-full max-w-md"><p className="mb-2 text-center text-sm text-slate-600">Slaget landade <strong>{Math.round(carry)} m</strong> och {offline===0?<strong>på mållinjen</strong>:<><strong>{Math.round(offline)} m {side===-1?"vänster":"höger"}</strong> om målet</>}.</p><Button onClick={add} disabled={offline>0&&side===null} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white disabled:opacity-40">Registrera slag</Button></div></div>{index>0&&<Button variant="ghost" onClick={undo} className="mt-1 w-full text-slate-500"><Undo2/>Ändra förra slaget</Button>}</section></div>
 :view==="compiling"?createPortal(<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-700 p-6 text-center text-white"><span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600">{compile>=3?<Check className="h-9 w-9"/>:<LoaderCircle className="h-9 w-9 motion-safe:animate-spin"/>}</span><h1 className="text-3xl font-black">{compile>=3?"Resultatet klart":"Sammanställer testet…"}</h1><div className="mt-6 w-full max-w-xs space-y-4 text-left text-blue-100">{["Sammanställer dina slag","Beräknar snitt från flaggan","Förbereder din HCP-analys"].map((x,i)=><p key={x} className={`flex items-center gap-3 ${i<=compile?"opacity-100":"opacity-0"}`}>{i<compile||compile>=3?<Check className="h-5 w-5"/>:<LoaderCircle className="h-5 w-5 motion-safe:animate-spin"/>}{x}</p>)}</div></div>,document.body)
 :result&&summary&&result?<div className="space-y-4"><section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm"><span className="a-sheen pointer-events-none absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-blue-100/80 to-transparent"/><p className="text-xs font-black uppercase text-slate-400">Ditt resultat</p><h1 className="mt-1 text-2xl font-black">{testTitle} klart</h1><div className="mt-5 rounded-2xl bg-slate-50 p-6"><p className="text-6xl font-black text-slate-950">{fmt(summary.avgProximity)} m</p><p className="mt-2 text-sm font-semibold text-slate-500">Snitt från flaggan</p></div></section><Button disabled={!lastSession} onClick={()=>lastSession&&openAnalysis(lastSession)} className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">Visa min HCP-analys</Button><Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-white"><RotateCcw/>Testa igen · {totalShots} slag</Button><Button variant="outline" onClick={onExit} className="min-h-14 w-full rounded-2xl border-slate-200 bg-white text-slate-900"><ArrowLeft/>Tillbaka till HCP-tester</Button></div>:null}
 <Dialog open={analysis} onOpenChange={setAnalysis}><DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white"><DialogTitle className="sr-only">{testTitle} HCP-analys</DialogTitle><DialogDescription className="sr-only">Ditt estimerade Approach-HCP.</DialogDescription>{analysisResult?<StandardHcpAnalysis title={`${testTitle} HCP-analys`} hcp={analysisResult.handicap} onClose={()=>setAnalysis(false)} slides={[
 {key:"categories",content:<ApproachCategorization shots={analysisFilled}/>},
 {key:"pyramid",content:<ApproachPyramid hcp={analysisResult.handicap}/>},
 {key:"best",content:(()=>{const best=[...analysisFilled].sort((a,b)=>Math.hypot(a.carry-a.target,a.offline)-Math.hypot(b.carry-b.target,b.offline))[0];const proximity=best?Math.hypot(best.carry-best.target,best.offline):0;const bestHcp=best?Math.max(-6,Math.min(36,((proximity/best.target*100)-6.7)*2.2)):0;return <BestShotHcpReveal hcp={bestHcp}/>})()}
]} />:null}</DialogContent></Dialog>
 </main>
}