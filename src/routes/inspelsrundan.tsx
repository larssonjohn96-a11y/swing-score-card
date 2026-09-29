import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { NineShotApproachTest } from "@/components/nine-shot-approach-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

type ApproachMode = "total" | "short" | "medium" | "long";

const TESTS: Array<{
  mode: ApproachMode;
  title: string;
  range: string;
  description: string;
  shots: number;
  targets: readonly number[];
}> = [
  {
    mode: "total",
    title: "Inspel totalt",
    range: "55–165 m",
    description: "Hela ditt inspelsspel i ett snabbt test över flera avstånd.",
    shots: 9,
    targets: [55,64,73,82,91,110,128,146,165],
  },
  {
    mode: "short",
    title: "Korta inspel",
    range: "50–100 m",
    description: "Testa precisionen på scoring-avstånden närmast green.",
    shots: 6,
    targets: [50,60,70,80,90,100],
  },
  {
    mode: "medium",
    title: "Medellånga inspel",
    range: "100–140 m",
    description: "Mät hur stabil din precision är genom de vanligaste järnavstånden.",
    shots: 6,
    targets: [100,108,116,124,132,140],
  },
  {
    mode: "long",
    title: "Långa inspel",
    range: "140–190 m",
    description: "Ett specialisttest för längre inspel och högre krav på bollträff.",
    shots: 6,
    targets: [140,150,160,170,180,190],
  },
];

export const Route=createFileRoute("/inspelsrundan")({
  validateSearch:(search:Record<string,unknown>)=>({
    mode:TESTS.some(test=>test.mode===search.mode)?search.mode as ApproachMode:undefined,
  }),
  head:()=>({meta:[{title:"Inspel HCP-tester | SG4"}]}),
  component:ApproachRoundPage,
});

function ApproachRoundPage(){
  const navigate=useNavigate();
  const {mode}=Route.useSearch();
  useHideBottomNav(true);
  const selected=TESTS.find(test=>test.mode===mode);

  if(selected){
    return <NineShotApproachTest
      key={selected.mode}
      modeKey={selected.mode}
      testTitle={selected.title}
      targets={selected.targets}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
  }

  return <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 text-slate-950">
    <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-slate-50/92 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/spela-runda" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
          <ArrowLeft className="h-4 w-4"/>
        </Link>
        <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">HCP-tester</p><p className="text-[15px] font-bold">Inspel</p></div>
        <span/>
      </div>
    </header>

    <section className="px-5 pt-7">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Approach HCP</p>
      <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em]">Välj ditt inspelstest</h1>
      <p className="mt-4 max-w-sm text-[16px] font-medium leading-[1.5] text-slate-600">Testa hela spannet eller gå djupare på den längd du vill mäta.</p>
    </section>

    <section className="mt-7 space-y-3 px-5">
      {TESTS.map((test,index)=><Link
        key={test.mode}
        to="/inspelsrundan"
        search={{mode:test.mode}}
        className={`flex min-h-[138px] items-center gap-4 rounded-[26px] border p-4 shadow-sm ${index===0?"border-blue-200 bg-blue-600 text-white":"border-slate-200 bg-white"}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[.16em] ${index===0?"text-blue-100":"text-blue-600"}`}>{test.range} · {test.shots} slag</p>
          <h2 className="mt-1 text-[25px] font-black leading-none">{test.title}</h2>
          <p className={`mt-2 text-[12px] font-medium leading-snug ${index===0?"text-blue-50/85":"text-slate-500"}`}>{test.description}</p>
        </div>
        <ChevronRight className={`h-5 w-5 shrink-0 ${index===0?"text-white":"text-slate-400"}`}/>
      </Link>)}
    </section>
  </main>;
}
