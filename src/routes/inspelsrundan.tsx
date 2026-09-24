import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NineShotApproachTest } from "@/components/nine-shot-approach-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
export const Route=createFileRoute("/inspelsrundan")({head:()=>({meta:[{title:"Inspel Challenge | SG4"}]}),component:ApproachRoundPage});
function ApproachRoundPage(){const navigate=useNavigate();useHideBottomNav(true);return <NineShotApproachTest onExit={()=>void navigate({to:"/spela-runda"})}/>}
