import { describe, expect, it } from "vitest";
import { approachHistorySummary, peiHistoryRows, precisionHistoryRows } from "./approach-history";
import type { PrecisionSession } from "./precision-store";

describe("approach distance and PEI summaries", () => {
  it("calculates average miss in meters separately from the average of shot percentages", () => {
    const rows = peiHistoryRows([
      {
        id: "1",
        date: "2026-10-01",
        pei: 7.5,
        shots: [
          { target: 100, actual: 103, lateral: 4 },
          { target: 50, actual: 50, lateral: 5 },
        ],
      },
    ]);
    expect(rows[0].meters).toBe(5);
    expect(rows[0].pei).toBe(7.5);
    const precision = precisionHistoryRows([
      {
        id: "1",
        date: "2026-10-01",
        avgProximity: 5,
        shots: [
          { target: 100, carry: 103, offline: -4, filled: true },
          { target: 50, carry: 50, offline: 5, filled: true },
        ],
      } as PrecisionSession,
    ]);
    expect(precision[0]).toEqual(rows[0]);
  });
  it("uses the last five by date and keeps the latest test separate", () => {
    const rows = [1, 2, 3, 4, 5, 6]
      .map((n) => ({ id: String(n), date: `2026-10-0${n}`, meters: n, pei: n * 2 }))
      .reverse();
    expect(approachHistorySummary(rows)).toEqual({
      count: 6,
      recentCount: 5,
      recent: { meters: 4, pei: 8 },
      latest: rows[0],
    });
  });
  it("handles fewer than five tests and does not invent distances for older results without shot data", () => {
    const rows = [
      { id: "1", date: "2026-10-01", meters: 9.4, pei: 10 },
      { id: "2", date: "2026-10-02", meters: 9, pei: 9 },
      { id: "3", date: "2026-10-03", meters: 7.1, pei: 8 },
    ];
    expect(approachHistorySummary(rows).recent.meters).toBe(8.5);
    expect(approachHistorySummary(rows).latest?.meters).toBe(7.1);
    expect(peiHistoryRows([{ id: "old", date: "2026-10-01", pei: 5 }])[0].meters).toBeNull();
    expect(approachHistorySummary([]).recent).toEqual({ meters: null, pei: null });
  });
});
