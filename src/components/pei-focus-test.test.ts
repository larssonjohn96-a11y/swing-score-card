import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { WEDGE_TARGETS } from "./pei-focus-test";

const EXPECTED_TARGETS = [30, 40, 50, 60, 70, 80, 90, 100, 110];

const source = readFileSync("src/components/pei-focus-test.tsx", "utf8");
const wedgeConfig = source.match(/wedge: \{[^}]*\}/)![0];
const ironConfig = source.match(/iron: \{[^}]*\}/)![0];
const startFn = source.slice(
  source.indexOf("function start()"),
  source.indexOf("function adjustDistance"),
);
const commitFn = source.slice(
  source.indexOf("function commit()"),
  source.indexOf("function back()"),
);
const generator = source.slice(
  source.indexOf("function generateDistances"),
  source.indexOf("function shotPei"),
);

describe("Wedge PEI fixed nine-shot sequence", () => {
  it("uses the exact 9 ascending targets, one shot per distance", () => {
    expect([...WEDGE_TARGETS]).toEqual(EXPECTED_TARGETS);
    expect(WEDGE_TARGETS).toHaveLength(9);
    expect(new Set(WEDGE_TARGETS).size).toBe(9);
    expect(WEDGE_TARGETS.every((d, i) => i === 0 || d > WEDGE_TARGETS[i - 1])).toBe(true);
    expect(Math.min(...WEDGE_TARGETS)).toBe(30);
    expect(Math.max(...WEDGE_TARGETS)).toBe(110);
  });

  it("ends the round after the last shot using a dynamic count", () => {
    expect(wedgeConfig).toContain("targets: WEDGE_TARGETS");
    expect(wedgeConfig).toContain("shotCount: WEDGE_TARGETS.length");
    expect(commitFn).toContain("if (index === updated.length - 1)");
    expect(source).toContain("Slag {index + 1} / {shots.length}");
    expect(source).toContain('index === shots.length - 1 ? "Avsluta test"');
    expect(source).toContain("(index / shots.length) * 100");
    expect(source).toContain("Starta {cfg.shotCount} slag");
    expect(source).not.toContain("index === 17");
    expect(source).not.toMatch(/\/ 18</);
    expect(source).not.toMatch(/Starta 18 slag/);
  });

  it("keeps Iron PEI at 18 randomised shots between 120 and 190 m", () => {
    expect(ironConfig).not.toContain("targets:");
    expect(ironConfig).toContain("shotCount: 18");
    expect(ironConfig).toContain("min: 120, max: 190");
    expect(startFn).toContain("generateDistances(cfg.min, cfg.max, cfg.shotCount)");
    expect(generator).toContain(
      "function generateDistances(min: number, max: number, count: number)",
    );
    expect(generator).toContain("Math.random");
    expect(generator).not.toContain("const count = 18");
  });

  it("describes 9 fixed ascending shots from 30 to 110 m without claiming randomisation", () => {
    expect(wedgeConfig).toContain("9 slag på fasta, stigande avstånd från 30 till 110 m");
    expect(wedgeConfig).toContain("Ett slag per avstånd");
    expect(wedgeConfig).not.toMatch(/slump/i);
    expect(ironConfig).toContain("18 kontrollerat slumpade avstånd mellan 120–190 m");

    const choose = readFileSync("src/routes/approach-pei-valj.tsx", "utf8");
    const wedgeCard = choose.slice(
      choose.indexOf('"/approach-pei-wedge"'),
      choose.indexOf('"/approach-pei-iron"'),
    );
    expect(wedgeCard).toContain('range: "30–110 m"');
    expect(wedgeCard).toContain("9 slag");
    expect(wedgeCard).toContain("fasta stigande avstånd");

    const tests = readFileSync("src/routes/standardiserade-tester.tsx", "utf8");
    const wedgeTestCard = tests.slice(
      tests.indexOf('to: "/approach-pei-wedge"'),
      tests.indexOf('to: "/approach-pei-iron"'),
    );
    expect(wedgeTestCard).toContain('distance: "30–110 m"');
    expect(wedgeTestCard).toContain("9 fasta stigande avstånd");
    expect(wedgeTestCard).not.toContain("18 varierade");
  });

  it("leaves PEI scoring, storage keys and history wiring unchanged", () => {
    expect(source).toContain(
      "(Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100",
    );
    expect(source).toContain("shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length");
    expect(wedgeConfig).toContain('key: LEGACY_KEYS.peiWedge, testId: "pei-wedge"');
    expect(ironConfig).toContain('key: LEGACY_KEYS.peiIron, testId: "pei-iron"');
    expect(source).toContain("recordSessionSaved(cfg.testId, record)");
    expect(commitFn).toContain("setPhase(\"result\")");
  });
});
