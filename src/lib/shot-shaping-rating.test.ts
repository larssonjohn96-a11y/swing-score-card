import { describe, expect, it } from "vitest";
import { computeShotShapingRating } from "@/lib/shot-shaping-rating";
import type { TrainingSession } from "@/lib/training/core";

function session(id: string, date: string, total: number): TrainingSession {
  return { id, date, shots: [], total };
}

describe("Shot Shaping rating", () => {
  it("uses the latest five tests and keeps one decimal", () => {
    const result = computeShotShapingRating([
      {
        maxScore: 10,
        sessions: [
          session("1", "2026-01-01T00:00:00.000Z", 4),
          session("2", "2026-01-02T00:00:00.000Z", 8),
          session("3", "2026-01-03T00:00:00.000Z", 9),
          session("4", "2026-01-04T00:00:00.000Z", 8),
          session("5", "2026-01-05T00:00:00.000Z", 9),
          session("6", "2026-01-06T00:00:00.000Z", 9.5),
        ],
      },
    ]);

    expect(result).toEqual({ rating: 8.7, count: 5 });
  });

  it("normalizes 9 Window to the same 0-10 rating scale", () => {
    const result = computeShotShapingRating([
      { maxScore: 9, sessions: [session("1", "2026-01-01T00:00:00.000Z", 9)] },
      { maxScore: 10, sessions: [session("2", "2026-01-02T00:00:00.000Z", 8)] },
    ]);

    expect(result).toEqual({ rating: 9, count: 2 });
  });

  it("combines all Shot Shaping test types by date before taking the latest five", () => {
    const result = computeShotShapingRating([
      {
        maxScore: 9,
        sessions: [
          session("a", "2026-01-01T00:00:00.000Z", 9),
          session("d", "2026-01-04T00:00:00.000Z", 9),
        ],
      },
      {
        maxScore: 10,
        sessions: [
          session("b", "2026-01-02T00:00:00.000Z", 6),
          session("e", "2026-01-05T00:00:00.000Z", 10),
        ],
      },
      {
        maxScore: 10,
        sessions: [
          session("c", "2026-01-03T00:00:00.000Z", 7),
          session("f", "2026-01-06T00:00:00.000Z", 9),
        ],
      },
    ]);

    expect(result).toEqual({ rating: 8.4, count: 5 });
  });
});
