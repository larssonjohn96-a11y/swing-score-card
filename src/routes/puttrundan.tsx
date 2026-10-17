import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NineHolePuttingTest } from "@/components/nine-hole-putting-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

type PuttingMode = "short" | "long";

const TESTS = [
  {
    mode: "short" as const,
    title: "Kortputt",
    range: "1–5 m",
    targets: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
  },
  {
    mode: "long" as const,
    title: "Långputt",
    range: "6–18 m",
    targets: [6, 7, 8, 9, 10, 12, 14, 16, 18],
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
      shuffleDistances={false}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
}