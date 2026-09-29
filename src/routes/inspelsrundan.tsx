import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
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
    range: "50–150 m",
    description: "Hela ditt inspelsspel i ett snabbt test över flera avstånd.",
    shots: 6,
    targets: [50,70,90,110,130,150],
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

  return <Navigate to="/spela-runda" replace />;

}
