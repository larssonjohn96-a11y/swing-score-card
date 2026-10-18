import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAnalysisParts } from "./analysis-category-parts";
function storage(data:Record<string,unknown>) {
  const localStorage = {getItem:(key:string)=>JSON.stringify(data[key]??[])};
  vi.stubGlobal("localStorage",localStorage);vi.stubGlobal("window",{localStorage});
}
afterEach(()=>vi.unstubAllGlobals());
describe("analysis category parts",()=>{
  it("leaves untested areas empty instead of inventing an HCP",()=>{
    storage({});
    const parts=loadAnalysisParts();
    for(const rows of Object.values(parts)) for(const row of rows) {expect(row.hcp).toBeUndefined();expect(row.count).toBe(0);}
  });
  it("reads the current driver and short putt formats and keeps fairway/OB as percentages",()=>{
    storage({"sg4-offtee-three-shot-v1":[{at:1,shots:[{distance:220,lateral:0},{distance:220,lateral:20},{distance:220,lateral:30}]}],"sg4-putting-nine-hole-v1-short":[{at:1,distances:[1,1.5,2,3,4,1.5,2,3,4],putts:[1,1,2,2,2,1,2,2,2]}]});
    const parts=loadAnalysisParts();
    expect(parts.driving?.find(p=>p.label==="Längd")?.hcp).toBeTypeOf("number");
    expect(parts.driving?.find(p=>p.label==="Fairway")?.value).toBe("33 %");
    expect(parts.driving?.find(p=>p.label==="OB-zon")?.hcp).toBeUndefined();
    expect(parts.puttning?.[0].hcp).toBeTypeOf("number");
    expect(parts.puttning?.[1].hcp).toBeUndefined();
  });
});
