import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanHistory, loadAnalysisHistory, HISTORY_OPTIONS } from "./analysis-history";
const storage=(data:Record<string,unknown>)=>{const localStorage={getItem:(key:string)=>JSON.stringify(data[key]??[])};vi.stubGlobal("localStorage",localStorage);vi.stubGlobal("window",{localStorage});};
afterEach(()=>vi.unstubAllGlobals());
describe("analysis timeline",()=>{
  it("keeps multiple same-day tests in time order and rejects invalid values",()=>{
    const day=Date.UTC(2026,9,18);
    expect(cleanHistory([{time:day+2000,hcp:4},{time:NaN,hcp:10},{time:day,hcp:NaN},{time:day+1000,hcp:7}])).toEqual([{time:day+1000,hcp:7},{time:day+2000,hcp:4}]);
  });
  it("offers Ball Speed and never fills missing histories with fabricated points",()=>{
    storage({});expect(HISTORY_OPTIONS).toContainEqual(["speed","Ball Speed"]);
    for(const [kind] of HISTORY_OPTIONS) expect(loadAnalysisHistory(kind,null)).toEqual([]);
  });
  it("loads completed current chip tests without changing HCP calculation",()=>{
    storage({"sg4-chip-nine-shot-v1":[{at:1000,balls:[[3,3,3],[3,3,3],[3,3,3]]},{at:2000,balls:[[3],[],[]]}]});
    const points=loadAnalysisHistory("chipping",null);expect(points).toHaveLength(1);expect(points[0].time).toBe(1000);expect(Number.isFinite(points[0].hcp)).toBe(true);
  });
});
