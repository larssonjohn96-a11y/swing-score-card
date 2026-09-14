import { describe, expect, it } from "vitest";
import {
  allowedDistancesInsideBand,
  getFriendMatchPacing,
  getPlannedDistanceBand,
  summarizeFriendHeadToHead,
} from "@/lib/friend-match-experience";

describe("friend match experience", () => {
  it("keeps adaptive putting inside planned bands", () => {
    expect(getPlannedDistanceBand("putting", 5)).toEqual({ min: 1, max: 7 });
    expect(getPlannedDistanceBand("putting", 11)).toEqual({ min: 8, max: 14 });
    expect(getPlannedDistanceBand("putting", 19)).toEqual({ min: 15, max: 22 });
  });

  it("keeps adaptive chipping inside planned bands", () => {
    expect(getPlannedDistanceBand("chip", 12)).toEqual({ min: 8, max: 14 });
    expect(getPlannedDistanceBand("chip", 18)).toEqual({ min: 15, max: 22 });
    expect(getPlannedDistanceBand("chip", 27)).toEqual({ min: 23, max: 30 });
  });

  it("preserves meaningful variation when possible", () => {
    const putting = allowedDistancesInsideBand("putting", 19, 12);
    expect(putting.every((d) => d >= 15 && d <= 22)).toBe(true);
    expect(putting.every((d) => Math.abs(d - 12) >= 5)).toBe(true);
  });

  it("gives 3, 5 and 7 hole matches distinct pacing", () => {
    expect(getFriendMatchPacing(3).transitionMs).toBeLessThan(getFriendMatchPacing(5).transitionMs);
    expect(getFriendMatchPacing(5).transitionMs).toBeLessThan(getFriendMatchPacing(7).transitionMs);
  });

  it("summarizes head to head history", () => {
    const entries = [
      { id: "1", playedAt: "2026-01-01", selfKey: "me", opponentKey: "a", selfName: "Me", opponentName: "A", category: "putting", length: 5 as const, winner: "blue" as const, finalText: "" },
      { id: "2", playedAt: "2026-01-02", selfKey: "me", opponentKey: "a", selfName: "Me", opponentName: "A", category: "chip", length: 3 as const, winner: "red" as const, finalText: "" },
      { id: "3", playedAt: "2026-01-03", selfKey: "me", opponentKey: "a", selfName: "Me", opponentName: "A", category: "putting", length: 7 as const, winner: "tie" as const, finalText: "" },
    ];
    expect(summarizeFriendHeadToHead(entries, "me", "a")).toEqual({ played: 3, wins: 1, losses: 1, ties: 1 });
  });
});
