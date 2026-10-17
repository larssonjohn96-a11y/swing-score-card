import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { IRON_TARGETS, WEDGE_TARGETS } from "./pei-focus-test";

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
  source.indexOf('if (phase === "intro")'),
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
    expect(source).toContain("current={index + 1} total={shots.length}");
    expect(source).toContain("Registrera slag");
    expect(source).toContain('setPhase("compiling")');
    expect(source).toContain("Starta testet");
    expect(source).not.toContain("index === 17");
    expect(source).not.toMatch(/\/ 18</);
    expect(source).not.toMatch(/Starta 18 slag/);
  });

  it("uses the agreed nine fixed iron targets from 120 to 175 m", () => {
    expect([...IRON_TARGETS]).toEqual([120, 125, 135, 140, 150, 155, 165, 170, 175]);
    expect(ironConfig).toContain("targets: IRON_TARGETS");
    expect(ironConfig).toContain("shotCount: IRON_TARGETS.length");
    expect(startFn).toContain("cfg.targets.map");
  });

  it("describes 9 fixed ascending shots from 30 to 110 m without claiming randomisation", () => {
    expect(wedgeConfig).toContain("9 slag på fasta, stigande avstånd från 30 till 110 m");
    expect(wedgeConfig).toContain("Ett slag per avstånd");
    expect(wedgeConfig).not.toMatch(/slump/i);
    expect(ironConfig).toContain("9 slag på fasta, stigande avstånd från 120 till 175 m");

    const choose = readFileSync("src/routes/approach-pei-valj.tsx", "utf8");
    const wedgeCard = choose.slice(
      choose.indexOf('"/approach-pei-wedge"'),
      choose.indexOf('"/approach-pei-iron"'),
    );
    expect(wedgeCard).toContain('range: "30–110 m"');
    expect(wedgeCard).toContain("9 slag");
    expect(wedgeCard).toContain("fasta stigande avstånd");

    const tests = readFileSync("src/routes/spela-runda.tsx", "utf8");
    expect(tests).toContain('to:"/approach-pei-wedge"');
    expect(tests).toContain('detail:"30–110 m · 9 slag"');
    expect(tests).toContain('detail:"120–175 m · 9 slag"');
  });

  it("leaves PEI scoring, storage keys and history wiring unchanged", () => {
    expect(source).toContain(
      "(Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100",
    );
    expect(source).toContain("shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length");
    expect(wedgeConfig).toMatch(/key: LEGACY_KEYS.peiWedge,\s*testId: "pei-wedge"/);
    expect(ironConfig).toMatch(/key: LEGACY_KEYS.peiIron,\s*testId: "pei-iron"/);
    expect(source).toContain("recordSessionSaved(cfg.testId, record)");
    expect(commitFn).toContain('setPhase("compiling")');
    expect(source).toContain('window.setTimeout(() => setPhase("result"), 3100)');
  });

  it("uses the HCP-style flow and explicit left/right input without a last-chance label", () => {
    expect(source).toContain("HcpCountdownScreen");
    expect(source).toContain("Sammanställer testet…");
    expect(source).toContain("Visa min HCP-analys");
    expect(source).toContain("← Vänster");
    expect(source).toContain("Höger →");
    expect(source).toContain("Välj först vänster eller höger");
    expect(source).not.toContain("Sista chansen");
    expect(source).not.toContain("Sista slaget");
  });
});
