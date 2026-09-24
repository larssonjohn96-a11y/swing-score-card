import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ThreeShotDriverTest } from "@/components/three-shot-driver-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
export const Route=createFileRoute("/driverrundan")({head:()=>({meta:[{title:"Utslag Challenge | SG4"}]}),component:DriverRoundPage});
function DriverRoundPage(){const navigate=useNavigate();useHideBottomNav(true);return <ThreeShotDriverTest mode="offtee" onExit={()=>void navigate({to:"/spela-runda"})}/>}
