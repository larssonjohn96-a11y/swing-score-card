import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROACH_HCP_LEVELS, APPROACH_MODEL_VERSION, approachPercentForHcp, approachZoneRadius } from "./approach-hcp-model";
import { handicapFromPct, PRECISION_BENCHMARKS } from "./precision";
import { bestStars, loadStarRounds, starStatus, starTargets, storeStarRound, type ApproachStarRound } from "./approach-star-game";
const make = (hits: boolean[], hcp: ApproachStarRound["hcp"]=20, kind: ApproachStarRound["kind"]="wedge"):ApproachStarRound=>({id:"one",date:"2026-10-18",kind,hcp,model:APPROACH_MODEL_VERSION,hits});
afterEach(()=>vi.unstubAllGlobals());
describe("approach HCP challenges",()=>{
 it("uses the existing test model and one set of benchmark values",()=>{
   for(const h of APPROACH_HCP_LEVELS.filter(h=>h<=36)) expect(handicapFromPct(approachPercentForHcp(h))).toBe(h);
   expect(PRECISION_BENCHMARKS.find(b=>b.label==="SG4 HCP 0")?.pct).toBe(6.7);
 });
 it("tightens zones with difficulty and scales them with distance",()=>{
   for(const target of [...starTargets("wedge"),...starTargets("iron")]){
     const radii=APPROACH_HCP_LEVELS.map(h=>approachZoneRadius(target,h));
     expect(radii.every((r,i)=>r>0&&(i===0||r<radii[i-1]))).toBe(true);
   }
   expect(approachZoneRadius(100,0)).toBe(6.7);
   expect(starTargets("wedge")).toEqual([30,40,50,60,70,80,90,100,110]);
   expect(starTargets("iron")).toEqual([120,125,135,140,150,155,165,170,175]);
 });
 it("requires completed rounds, seven to pass and nine for perfect",()=>{
   expect(starStatus(Array(7).fill(true))).toBe("playing");
   expect(starStatus([...Array(6).fill(true),false,false,false])).toBe("retry");
   expect(starStatus([...Array(7).fill(true),false,false])).toBe("passed");
   expect(starStatus(Array(9).fill(true))).toBe("perfect");
 });
 it("keeps best single round separate by kind, HCP and model",()=>{
   const rounds=[make([true,...Array(8).fill(false)]),make([false,...Array(8).fill(true)]),make(Array(9).fill(true),10),make(Array(9).fill(true),20,"iron"),{...make(Array(9).fill(true)),model:"other"}];
   expect(bestStars(rounds,"wedge",20)).toBe(8);
   expect(bestStars(rounds,"wedge",5)).toBeNull();
 });
 it("undoes saved final shots without duplicate records",()=>{
   const data=new Map<string,string>();vi.stubGlobal("window",{});vi.stubGlobal("localStorage",{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
   const r=make(Array(9).fill(true));storeStarRound(r);storeStarRound(r);expect(loadStarRounds()).toHaveLength(1);
   storeStarRound({...r,hits:r.hits.slice(0,8)});expect(loadStarRounds()).toHaveLength(0);
   storeStarRound({...r,hits:[...r.hits.slice(0,8),false]});expect(bestStars(loadStarRounds(),"wedge",20)).toBe(8);
 });
});
