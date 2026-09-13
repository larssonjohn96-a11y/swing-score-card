import { describe, expect, it } from "vitest";
import { simulateChipBotResult, simulateDriveBotResult, simulatePuttingBotStrokes } from "./bot-skill-model";

function sequence(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0.5;
}

describe("bot skill model", () => {
  it("lets a 27 hcp player duff a long chip badly", () => {
    const result = simulateChipBotResult(27, 27, sequence([0.01, 0.9, 0.15]));
    expect(result.strike).toBe("duff");
    expect(result.points).toBe(0);
    expect(result.proximity).toBeGreaterThan(10);
  });

  it("lets a 27 hcp player blade a long chip well past the flag", () => {
    const result = simulateChipBotResult(27, 27, sequence([0.01, 0.1, 0.9]));
    expect(result.strike).toBe("thin");
    expect(result.points).toBe(0);
    expect(result.proximity).toBeGreaterThan(8);
  });

  it("does not hand a 27 hcp player a routine inside-1m result from 27m", () => {
    const result = simulateChipBotResult(27, 27, sequence([0.8, 0.8, 0.8, 0.4]));
    expect(result.points).toBeLessThan(4);
  });

  it("allows elite chippers to produce excellent long-chip outcomes", () => {
    const result = simulateChipBotResult(27, -5, sequence([0.8, 0.8, 0.01, 0.2]));
    expect(result.points).toBe(4);
  });

  it("makes a 27 hcp player materially less automatic from 3m putting", () => {
    expect(simulatePuttingBotStrokes(3, 27, sequence([0.9, 0.9]))).toBe(2);
  });

  it("includes topped drives for high handicaps", () => {
    const result = simulateDriveBotResult(30, sequence([0.01, 0.2, 0.2]));
    expect(result.hit).toBe(false);
    expect(result.strike).toBe("top");
    expect(result.carry).toBeLessThan(170);
  });
});
