import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ThreeShotDriverTest } from "@/components/three-shot-driver-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
export const Route=createFileRoute("/longdrive")({head:()=>({meta:[{title:"Long Drive Challenge | SG4"}]}),component:LongDrivePage});
function LongDrivePage(){const navigate=useNavigate();useHideBottomNav(true);return <ThreeShotDriverTest mode="longdrive" onExit={()=>void navigate({to:"/traning",search:{category:"off-the-tee"}})}/>}
