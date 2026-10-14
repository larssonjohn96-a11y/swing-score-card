import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { WEDGE_TARGETS } from "./pei-focus-test";

const EXPECTED_TARGETS = [
  30, 40, 40, 50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 110, 110, 120,
];

const source = readFileSync("src/components/pei-focus-test.tsx", "utf8");
const wedgeConfig = source.match(/wedge: \{[^}]*\}/)![0];
const ironConfig = source.match(/iron: \{[^}]*\}/)![0];
const startFn = source.slice(
  source.indexOf("function start()"),
  source.indexOf("function adjustDistance"),
);

describe("Wedge PEI fixed target sequence", () => {
  it("uses the exact 18 ascending targets from 30 to 120 m", () => {
    expect([...WEDGE_TARGETS]).toEqual(EXPECTED_TARGETS);
    expect(WEDGE_TARGETS).toHaveLength(18);
    expect(WEDGE_TARGETS.every((d, i) => i === 0 || d >= WEDGE_TARGETS[i - 1])).toBe(true);
    expect(Math.min(...WEDGE_TARGETS)).toBe(30);
    expect(Math.max(...WEDGE_TARGETS)).toBe(120);
  });

  it("starts from the fixed list so every restart is identical", () => {
    expect(wedgeConfig).toContain("targets: WEDGE_TARGETS");
    expect(startFn).toContain("cfg.targets ? [...cfg.targets] : generateDistances");
    expect(startFn).not.toContain("Math.random");
  });

  it("keeps Iron PEI randomised and the generic Approach PEI test untouched", () => {
    expect(ironConfig).not.toContain("targets:");
    expect(startFn).toContain("generateDistances(cfg.min, cfg.max)");
    const generic = readFileSync("src/lib/approach-pei.ts", "utf8");
    expect(generic).toContain("PEI_TARGET_DISTANCES");
    expect(generic).toContain("109, 201, 149, 66");
  });

  it("describes fixed ascending distances without claiming randomisation", () => {
    expect(wedgeConfig).toContain("fasta, stigande avstånd från 30 till 120 m");
    expect(wedgeConfig).toContain("18 slag");
    expect(wedgeConfig).not.toMatch(/slump/i);
    // Iron PEI keeps its original intro copy.
    expect(ironConfig).toContain("18 kontrollerat slumpade avstånd mellan 120–190 m");
  });

  it("leaves PEI scoring, storage keys and history wiring unchanged", () => {
    expect(source).toContain("(Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100");
    expect(source).toContain('shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length');
    expect(wedgeConfig).toContain("key: LEGACY_KEYS.peiWedge, testId: \"pei-wedge\"");
    expect(ironConfig).toContain("key: LEGACY_KEYS.peiIron, testId: \"pei-iron\"");
    expect(source).toContain("recordSessionSaved(cfg.testId, record)");
    expect(source).toContain("index === 17");
  });
});
