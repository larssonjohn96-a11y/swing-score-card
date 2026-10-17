import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIFTY_PUTT_TOTAL, FIFTY_PUTT_DISTANCES, FIFTY_PUTT_ROUNDS } from "./fifty-putts";

const source = (file: string) => readFileSync(`src/${file}`, "utf8");

describe("training and standardized test categorization", () => {
  it("redirects the retired advanced catalogue without deleting old exercise protocols", () => {
    expect(source("routes/standardiserade-tester.tsx")).toContain('redirect({ to: "/spela-runda", replace: true })');
    expect(FIFTY_PUTT_TOTAL).toBe(25);
    expect(FIFTY_PUTT_ROUNDS).toBe(5);
    expect([...FIFTY_PUTT_DISTANCES]).toEqual([1, 2, 3, 4, 5]);
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
