import { describe, expect, it } from "vitest";
import { driverDistancePotential } from "./driver-distance-potential";
describe("driver potential from ball speed", () => {
  it("converts the reference row from yards to metres", () => {
    expect(driverDistancePotential(155)).toEqual({ carry: 240, total: 265, extrapolated: false });
  });
  it("interpolates 160 mph without confusing ball speed with club speed", () => {
    expect(driverDistancePotential(160)).toEqual({ carry: 250, total: 275, extrapolated: false });
  });
  it("labels extrapolation and excludes absent or invalid measurements", () => {
    expect(driverDistancePotential(95)?.extrapolated).toBe(true);
    expect(driverDistancePotential(200)?.extrapolated).toBe(true);
    for (const invalid of [0, -1, NaN, Infinity, 251])
      expect(driverDistancePotential(invalid)).toBeNull();
  });
  it("keeps carry and total monotonic throughout accepted ball speeds", () => {
    let last = { carry: 0, total: 0 };
    for (let mph = 40; mph <= 250; mph++) {
      const next = driverDistancePotential(mph)!;
      expect(next.carry).toBeGreaterThanOrEqual(last.carry);
      expect(next.total).toBeGreaterThanOrEqual(last.total);
      expect(next.total).toBeGreaterThanOrEqual(next.carry);
      last = next;
    }
  });
});
