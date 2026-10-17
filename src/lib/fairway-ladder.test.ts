import { describe, expect, it, vi, afterEach } from "vitest";
import { addFairwayShot, fairwayProgress, fairwayHighScores, storeFairwayRound, loadFairwayRounds, type FairwayOutcome, type FairwayRound } from "./fairway-ladder";
const round = (id: string, carry: number, shots: FairwayOutcome[]): FairwayRound => ({ id, carry, shots, date: "2026-10-17T12:00:00Z" });
afterEach(() => vi.unstubAllGlobals());
describe("Fairwaystegen", () => {
 it("moves immediately on each hit and finishes all eight levels", () => {
   let shots: FairwayOutcome[] = [];
   for (const side of [20,15,10,5,4,3,2,1]) {
     expect(fairwayProgress(shots).side).toBe(side);
     shots = addFairwayShot(shots, "hit");
   }
   expect(fairwayProgress(shots)).toMatchObject({ won:true, finished:true, cleared:8, lives:3 });
   expect(addFairwayShot(shots,"left")).toEqual(shots);
 });
 it("keeps the level on a miss and carries hearts across levels", () => {
   const shots: FairwayOutcome[] = ["left","hit","short","hit","right"];
   expect(fairwayProgress(shots)).toMatchObject({ cleared:2, lives:0, finished:true, won:false });
   expect(addFairwayShot(shots,"hit")).toEqual(shots);
   expect(fairwayProgress(shots.slice(0,-1))).toMatchObject({ cleared:2, lives:1, finished:false });
 });
 it("compares only the same carry, by cleared levels then remaining hearts", () => {
   const perfect: FairwayOutcome[] = Array(8).fill("hit");
   const rounds = [round("loss",200,["hit","left","left","right"]),round("two",200,["left",...perfect]),round("other",250,perfect),round("best",200,perfect)];
   expect(fairwayHighScores(rounds,200).map(r=>r.id)).toEqual(["best","two","loss"]);
 });
 it("removes the finished record after undo and upserts a corrected finish", () => {
   const data = new Map<string,string>();
   vi.stubGlobal("window", {});
   vi.stubGlobal("localStorage", {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
   const r = round("same",200,["left","right","short"]);
   storeFairwayRound(r); storeFairwayRound(r);
   expect(loadFairwayRounds()).toHaveLength(1);
   storeFairwayRound({...r,shots:r.shots.slice(0,-1)});
   expect(loadFairwayRounds()).toHaveLength(0);
   storeFairwayRound({...r,shots:["left","right","hit","short"]});
   expect(loadFairwayRounds()[0].shots).toHaveLength(4);
 });
});
