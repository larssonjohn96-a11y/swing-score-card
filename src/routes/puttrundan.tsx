import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { NineHolePuttingTest } from "@/components/nine-hole-putting-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

type PuttingMode = "total" | "short" | "medium" | "long";

const TESTS: Array<{
  mode: PuttingMode;
  title: string;
  range: string;
  description: string;
  targets: readonly number[];
  shuffle?: boolean;
}> = [
  {
    mode: "total",
    title: "Putting totalt",
    range: "0,6–16 m",
    description: "18 hål över hela spannet. Håla varje boll och bygg din Putting-score.",
    targets: [1.5,12,0.6,4,1.2,16,8,3,6,9,0.9,7,2.1,3.5,10,1.8,5,2.4],
    shuffle: false,
  },
  {
    mode: "short",
    title: "Korta puttar",
    range: "1–2 m",
    description: "Mät hur ofta du sätter de korta puttarna som ska gå i.",
    targets: [1,1.5,2,1,1.5,2,1,1.5,2],
  },
  {
    mode: "medium",
    title: "Medellånga puttar",
    range: "3–7 m",
    description: "Testa scoring och längdkontroll från mellanavstånden.",
    targets: [3,5,7,3,5,7,3,5,7],
  },
  {
    mode: "long",
    title: "Långa puttar",
    range: "8–20 m",
    description: "Mät längdkontroll och hur väl du undviker treputtar.",
    targets: [8,14,20,8,14,20,8,14,20],
  },
];

export const Route=createFileRoute("/puttrundan")({
  validateSearch:(search:Record<string,unknown>)=>({
    mode:TESTS.some(test=>test.mode===search.mode)?search.mode as PuttingMode:undefined,
  }),
  head:()=>({meta:[{title:"Putting HCP-tester | SG4"}]}),
  component:PuttRoundPage,
});

function PuttRoundPage(){
  const navigate=useNavigate();
  const {mode}=Route.useSearch();
  useHideBottomNav(true);
  const selected=TESTS.find(test=>test.mode===mode);

  if(selected){
    return <NineHolePuttingTest
      key={selected.mode}
      modeKey={selected.mode}
      testTitle={selected.title}
      rangeLabel={selected.range}
      distances={selected.targets}
      shuffleDistances={selected.shuffle ?? true}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
  }

  return <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 text-slate-950">
    <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-slate-50/92 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/spela-runda" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
          <ArrowLeft className="h-4 w-4"/>
        </Link>
        <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">HCP-tester</p><p className="text-[15px] font-bold">Putting</p></div>
        <span/>
      </div>
    </header>

    <section className="px-5 pt-7">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Putting HCP</p>
      <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em]">Välj ditt puttingtest</h1>
      <p className="mt-4 max-w-sm text-[16px] font-medium leading-[1.5] text-slate-600">Putting totalt testar hela spannet över 18 hål. Kort, medel och lång är snabbare 9-hålstester.</p>
    </section>

    <section className="mt-7 space-y-3 px-5">
      {TESTS.map((test,index)=><Link
        key={test.mode}
        to="/puttrundan"
        search={{mode:test.mode}}
        className={`flex min-h-[138px] items-center gap-4 rounded-[26px] border p-4 shadow-sm ${index===0?"border-blue-200 bg-blue-600 text-white":"border-slate-200 bg-white"}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[.16em] ${index===0?"text-blue-100":"text-blue-600"}`}>{test.range} · {test.targets.length} hål</p>
          <h2 className="mt-1 text-[25px] font-black leading-none">{test.title}</h2>
          <p className={`mt-2 text-[12px] font-medium leading-snug ${index===0?"text-blue-50/85":"text-slate-500"}`}>{test.description}</p>
        </div>
        <ChevronRight className={`h-5 w-5 shrink-0 ${index===0?"text-white":"text-slate-400"}`}/>
      </Link>)}
    </section>
  </main>;
}
