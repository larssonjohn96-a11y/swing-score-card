import { createFileRoute,useNavigate } from "@tanstack/react-router";
import { NineShotChipTest } from "@/components/nine-shot-chip-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
export const Route=createFileRoute("/chipprundan")({head:()=>({meta:[{title:"Chipping Challenge | SG4"}]}),component:ChipRoundPage});
function ChipRoundPage(){const navigate=useNavigate();useHideBottomNav(true);return <NineShotChipTest onExit={()=>void navigate({to:"/spela-runda"})}/>}
