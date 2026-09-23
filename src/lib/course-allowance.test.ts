import { expect, it } from "vitest";
import { allowanceOptions, allowanceLabel, normalizeAllowance } from "./course-allowance";
it("offers eight choices for six holes with a maximum of three strokes per hole", () => {
  expect(allowanceOptions(6)).toEqual([1, 2, 3, 4, 5, 6, 12, 18]);
  expect(allowanceLabel(12, 6)).toBe("2 per hål (12 extra)");
});
it("retains individual strokes up to 17 for eighteen holes", () => {
  expect(allowanceOptions(18)).toEqual([
    ...Array.from({ length: 17 }, (_, i) => i + 1),
    18,
    36,
    54,
  ]);
});
it("adjusts previous selections to valid choices when the hole count changes", () => {
  expect(normalizeAllowance(36, 6)).toBe(18);
  expect(normalizeAllowance(12, 5)).toBe(10);
  expect(normalizeAllowance(0, 6)).toBe(0);
  for (let holes = 1; holes <= 18; holes++) {
    expect(Math.max(...allowanceOptions(holes))).toBe(holes * 3);
    expect(allowanceOptions(holes).every((n) => n < holes || n % holes === 0)).toBe(true);
  }
});
