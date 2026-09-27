import { useMemo, useState } from "react";
import { ArrowRight, Check, Target, X } from "lucide-react";
import type { CategoryHandicap, CategorySlug } from "@/lib/sg-handicap";
import { hcpLabel } from "@/lib/sg-handicap";

const TITLES: Record<CategorySlug,string> = {
  driving:"Utslag", approach:"Inspel", "around-the-green":"Närspel", puttning:"Puttning", speed:"Speed",
};

export function LowerHcpAssessment({ cats, totalHandicap }:{cats:CategoryHandicap[];totalHandicap:number|undefined}) {
  const [open,setOpen]=useState(false);
  const tested=useMemo(()=>cats.filter(c=>c.handicap!==undefined),[cats]);
  const weakest=useMemo(()=>tested.length?[...tested].sort((a,b)=>b.handicap!-a.handicap!)[0]:undefined,[tested]);
  const strongest=useMemo(()=>tested.length?[...tested].sort((a,b)=>a.handicap!-b.handicap!)[0]:undefined,[tested]);
  const missing=cats.filter(c=>c.handicap===undefined);
  const potential=weakest&&strongest?Math.max(strongest.handicap!,Math.round((weakest.handicap!-Math.max(2,(weakest.handicap!-strongest.handicap!)*0.45))*10)/10):undefined;
  const complete=tested.length>=4;

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="mt-6 w-full overflow-hidden rounded-[26px] bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 p-5 text-left text-white shadow-sm">
      <div className="flex min-h-[132px] flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-white/65">Assessment</span>
          {totalHandicap!==undefined?<span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">HCP {hcpLabel(totalHandicap)}</span>:null}
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1"><h2 className="text-[27px] font-black leading-[1.02]">Sänk mitt HCP</h2><p className="mt-2 text-sm text-white/75">{weakest?"Störst möjlighet: "+TITLES[weakest.slug]:"Gör testerna och hitta ditt största utvecklingsområde."}</p></div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700"><ArrowRight className="h-5 w-5"/></span>
        </div>
      </div>
    </button>

    {open&&<div className="fixed inset-0 z-[180] overflow-y-auto bg-slate-950 text-white">
      <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-950/90 px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur-xl">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Personlig HCP-analys</p><h1 className="mt-1 text-2xl font-black">Sänk mitt HCP</h1></div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Stäng" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5"/></button>
        </header>

        <section className="px-5 pt-5">
          <div className="rounded-[28px] bg-gradient-to-br from-violet-700 to-indigo-900 p-6">
            <p className="text-sm font-bold text-violet-200">Din nuvarande SG4-nivå</p>
            <div className="mt-2 flex items-end gap-2"><strong className="text-7xl font-black">{totalHandicap!==undefined?hcpLabel(totalHandicap):"–"}</strong><span className="mb-2 text-xl text-white/60">HCP</span></div>
            {potential!==undefined?<div className="mt-6 rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wide text-white/60">Nästa riktning</p><p className="mt-1 text-lg font-bold">Lyft {TITLES[weakest!.slug]} mot HCP {hcpLabel(potential)}</p><p className="mt-1 text-sm text-white/70">Det skulle jämna ut din profil mot dina starkare delar.</p></div>:null}
          </div>

          {!complete?<div className="mt-5 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5"><p className="font-bold">Analysen behöver mer data</p><p className="mt-1 text-sm text-white/65">Gör fler HCP-tester för säkrare prioriteringar. {missing.length?"Saknas: "+missing.map(c=>TITLES[c.slug]).join(", ")+".":""}</p></div>:null}

          {weakest&&strongest?<div className="mt-7">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-black">Ditt fokus</h2><span className="rounded-full border border-amber-300/50 px-3 py-1 text-xs font-bold text-amber-300">Prioritet 1</span></div>
            <div className="mt-3 rounded-3xl bg-white p-5 text-slate-950">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-500">Största utvecklingsområdet</p><h3 className="mt-1 text-3xl font-black">{TITLES[weakest.slug]}</h3></div><strong className="text-3xl">HCP {hcpLabel(weakest.handicap!)}</strong></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600" style={{width:String(Math.max(12,Math.min(100,100-weakest.handicap!*1.7)))+"%"}}/></div>
              <p className="mt-4 text-sm text-slate-600">Din starkaste kategori är <strong>{TITLES[strongest.slug]}</strong> på HCP {hcpLabel(strongest.handicap!)}. Skillnaden visar var träning sannolikt ger mest profilmässig effekt.</p>
            </div>
          </div>:null}

          <div className="mt-7"><h2 className="text-2xl font-black">Gör detta nu</h2>
            <div className="mt-3 space-y-2">
              {weakest?<>
                <Action n="1" title={"Fokusera på "+TITLES[weakest.slug]} text={"Utgå från ditt HCP "+hcpLabel(weakest.handicap!)+" och träna den här delen först."}/>
                <Action n="2" title="Träna med ett mätbart mål" text="Använd samma moment som testet så att förbättringen går att mäta."/>
                <Action n="3" title="Testa igen" text="Gör om HCP-testet efter träningsblocket och jämför mot din baseline."/>
              </>:<Action n="1" title="Skapa din baseline" text="Gör HCP-testerna först. Därefter kan SG4 prioritera vad du bör förbättra."/>}
            </div>
          </div>

          {tested.length?<div className="mt-7"><h2 className="text-2xl font-black">Din profil</h2><div className="mt-3 overflow-hidden rounded-3xl bg-white text-slate-950">{[...tested].sort((a,b)=>b.handicap!-a.handicap!).map((c,i)=><div key={c.slug} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"><span className={i===0?"flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700":"flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"}>{i===0?<Target className="h-4 w-4"/>:<Check className="h-4 w-4"/>}</span><span className="flex-1 font-bold">{TITLES[c.slug]}</span><strong>HCP {hcpLabel(c.handicap!)}</strong></div>)}</div></div>:null}

          <p className="mt-6 text-xs leading-relaxed text-white/45">Analysen bygger på dina SG4-testresultat och visar prioriteringar i din spelarprofil. Den är inte ett officiellt handicap eller en garanti för ett visst handicapresultat.</p>
        </section>
      </div>
    </div>}
  </>;
}

function Action({n,title,text}:{n:string;title:string;text:string}) {
 return <div className="flex gap-4 rounded-2xl bg-white/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 font-black">{n}</span><div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-relaxed text-white/60">{text}</p></div></div>;
}
