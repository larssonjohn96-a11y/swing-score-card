import { createFileRoute,useNavigate } from "@tanstack/react-router";
import { NineHolePuttingTest } from "@/components/nine-hole-putting-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
export const Route=createFileRoute("/puttrundan")({head:()=>({meta:[{title:"Putting HCP Test | SG4"}]}),component:PuttRoundPage});
function PuttRoundPage(){const navigate=useNavigate();useHideBottomNav(true);return <NineHolePuttingTest onExit={()=>void navigate({to:"/spela-runda"})}/>}
