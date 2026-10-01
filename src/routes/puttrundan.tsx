import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    range: "1–18 m",
    description: "9 hål över hela spannet: 4 korta, 3 medel och 2 långa puttar.",
    targets: [1,1.5,2,1.5,3,5,7,10,18],
  },
  {
    mode: "short",
    title: "Korta puttar",
    range: "1–2 m",
    description: "Mät hur ofta du sätter de korta puttarna som ska gå i.",
    targets: [1,1.5,2,1,1.5,2],
  },
  {
    mode: "medium",
    title: "Medellånga puttar",
    range: "3–7 m",
    description: "Testa scoring och längdkontroll från mellanavstånden.",
    targets: [3,5,7,4,6,3],
  },
  {
    mode: "long",
    title: "Långa puttar",
    range: "8–18 m",
    description: "Mät längdkontroll och hur väl du undviker treputtar.",
    targets: [8,12,16,10,16,18],
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
  const selected=TESTS.find(test=>test.mode===mode) ?? TESTS[0];

  return <NineHolePuttingTest
      key={selected.mode}
      modeKey={selected.mode}
      testTitle={selected.title}
      rangeLabel={selected.range}
      distances={selected.targets}
      shuffleDistances={selected.shuffle ?? true}
      modeOptions={TESTS.map(test=>({mode:test.mode,label:test.mode==="total"?"Alla längder":test.mode==="short"?"Korta":test.mode==="medium"?"Medel":"Långa",range:test.range}))}
      onModeChange={(nextMode)=>void navigate({to:"/puttrundan",search:{mode:nextMode},replace:true})}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
}