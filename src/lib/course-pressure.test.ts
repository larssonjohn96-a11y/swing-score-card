import { expect, it } from "vitest";
import { coursePressure } from "./course-pressure";
const names: [string,string]=["John","Fredrik"];
it("shows who can clinch the match",()=>{
  expect(coursePressure(names,"match",1,4,6)).toContain("John kan avgöra");
  expect(coursePressure(names,"match",-1,4,6)).toContain("Fredrik kan avgöra");
});
it("identifies must-win holes and a tied final hole",()=>{
  expect(coursePressure(names,"match",2,4,6)).toContain("Fredrik måste vinna");
  expect(coursePressure(names,"match",0,5,6)).toContain("Sista hålet");
});
it("does not show pressure for finished, decided or early matches",()=>{
  expect(coursePressure(names,"match",0,0,6)).toBeNull();
  expect(coursePressure(names,"match",3,4,6)).toBeNull();
  expect(coursePressure(names,"match",1,6,6)).toBeNull();
});
it("only calls out the final hole in stroke play",()=>{
  expect(coursePressure(names,"stroke",30,0,6)).toBeNull();
  expect(coursePressure(names,"stroke",30,5,6)).toContain("lägst totalresultat");
});
