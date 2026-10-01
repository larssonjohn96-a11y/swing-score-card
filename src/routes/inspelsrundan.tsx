import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    range: "50–180 m",
    description: "Hela ditt inspelsspel i ett snabbt test över flera avstånd.",
    shots: 6,
    targets: [50,80,110,140,160,180],
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
    range: "110–140 m",
    description: "Mät precision och avståndskontroll på medellånga inspel.",
    shots: 6,
    targets: [110,120,130,140,120,130],
  },
  {
    mode: "long",
    title: "Långa inspel",
    range: "150–180 m",
    description: "Ett specialisttest för längre inspel och högre krav på bollträff.",
    shots: 6,
    targets: [150,160,170,180,160,170],
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
  const selected=TESTS.find(test=>test.mode===mode) ?? TESTS[0];

  return <NineShotApproachTest
      key={selected.mode}
      modeKey={selected.mode}
      testTitle={selected.title}
      targets={selected.targets}
      modeOptions={TESTS.map(test=>({mode:test.mode,label:test.mode==="total"?"Alla längder":test.mode==="short"?"Korta":test.mode==="medium"?"Medel":"Långa",range:test.range}))}
      onModeChange={(nextMode)=>void navigate({to:"/inspelsrundan",search:{mode:nextMode},replace:true})}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
}
