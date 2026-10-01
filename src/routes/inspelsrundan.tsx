import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NineShotApproachTest } from "@/components/nine-shot-approach-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

const TRACKMAN_APPROACH_TARGETS = [55, 65, 75, 85, 95, 105, 125, 145, 165] as const;

export const Route=createFileRoute("/inspelsrundan")({
  head:()=>({meta:[{title:"Inspel HCP-test | SG4"}]}),
  component:ApproachRoundPage,
});

function ApproachRoundPage(){
  const navigate=useNavigate();
  useHideBottomNav(true);

  return <NineShotApproachTest
      modeKey="total"
      testTitle="Inspelstest"
      targets={TRACKMAN_APPROACH_TARGETS}
      onExit={()=>void navigate({to:"/spela-runda"})}
    />;
}
