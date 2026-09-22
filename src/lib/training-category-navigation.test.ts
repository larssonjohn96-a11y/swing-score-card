import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";
import { FIFTY_PUTT_TOTAL, FIFTY_PUTT_DISTANCES, FIFTY_PUTT_ROUNDS } from "./fifty-putts";

const source = (file: string) => readFileSync(`src/${file}`, "utf8");

describe("training and standardized test categorization", () => {
  it("lists the unchanged 25-ball protocol under Putting only", () => {
    const library = source("routes/standardiserade-tester.tsx");
    const putting = library.slice(library.indexOf('title: "Puttning"'), library.indexOf('title: "Närspel"'));
    const shortGame = library.slice(library.indexOf('title: "Närspel"'), library.indexOf('title: "Inspel"'));
    expect(putting).toContain('to: "/50-bollar", title: "25-bollsövningen", label: "Kortputt"');
    expect(shortGame).not.toContain('/50-bollar');
    expect(library).not.toContain('title: "50 Bollar"');
    expect(FIFTY_PUTT_TOTAL).toBe(25);
    expect(FIFTY_PUTT_ROUNDS).toBe(5);
    expect([...FIFTY_PUTT_DISTANCES]).toEqual([1, 2, 3, 4, 5]);
  });
  it("moves only the configurable bunker activity out of Tests", () => {
    const library = source("routes/standardiserade-tester.tsx");
    expect(library).not.toContain('/bunker-traning');
    expect(library).toContain('/fairway-streak');
    expect(CATEGORIES.flatMap(category => category.tests).some(test => test.to === '/bunker-test')).toBe(true);
  });
  it("keeps both bunker practice choices under the existing coach entry", () => {
    const coach = source("routes/coach.tsx");
    expect(coach).toContain('Guidad träning');
    expect(coach).toContain('Egen träning');
    expect(coach).toContain('to="/bunker-traning"');
    expect(coach).toMatch(/if \(linkedCategory === "bunker"\) \{\s*setPhase\("bunker-setup"\);\s*return;/);
    expect(coach).not.toContain('to="/tester"');
  });
  it("returns self-directed bunker practice to its category choice", () => {
    expect(source("routes/bunker-traning.tsx")).toContain('to="/coach" search={{ category: "bunker" }}');
  });
  it("preserves the tests origin through completion, history and retry", () => {
    const exercise = source("routes/50-bollar.tsx");
    const result = source("routes/50-bollar-resultat.tsx");
    expect(exercise).toContain('navigate({to:"/50-bollar-resultat",search:{from}})');
    expect(exercise).toContain('to="/50-bollar-resultat" search={{from}}');
    expect(result.match(/to="\/50-bollar" search=\{\{from\}\}/g)).toHaveLength(2);
    expect(result).toContain('fiftyBallBackTarget(from)');
  });
  it("does not overwrite existing Home category deep links", () => {
    const home = source("routes/index.tsx");
    expect(home).not.toContain('to="/coach" search={{}}');
    expect(home).toContain('search={{ category: "putting" }}');
    expect(home).toContain('search={{ category: "bunker" }}');
  });
});
