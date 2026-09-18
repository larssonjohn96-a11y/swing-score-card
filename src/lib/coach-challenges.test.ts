import { describe, expect, it } from "vitest";
import { advanceChallenge, challengeGap, createChallenge, nextChallengeLevel } from "./coach-challenges";
describe("coach challenges", () => {
  it("schedules three to five ordinary holes", () => {
    for (let i=0;i<100;i++) expect([3,4,5]).toContain(challengeGap());
  });
  it("uses three progressive ladder holes and always finishes despite misses", () => {
    let c = createChallenge("ladder", 1);
    expect(c.distance).toBe(.5);
    c = advanceChallenge(c, 2);
    expect(c.distance).toBe(1.5);
    c = advanceChallenge(c, 1);
    expect(c.distance).toBe(2);
    c = advanceChallenge(c, 2);
    expect(c.remaining).toBe(0);
    expect(c.successes).toBe(1);
  });
  it("judges pace from first-putt proximity rather than total putts", () => {
    const c = createChallenge("pace", 2, () => .999);
    expect(c.distance).toBe(15);
    expect(createChallenge("pace", 1, () => 0).distance).toBe(6);
    expect(advanceChallenge(c, 3, .8).successes).toBe(1);
    expect(advanceChallenge(c, 2, 2).successes).toBe(0);
    expect(advanceChallenge(c, 2, NaN).successes).toBe(0);
    expect(advanceChallenge(c, 1, 0).successes).toBe(1);
  });
  it("requires repeated outcomes to change level and clamps levels", () => {
    expect(nextChallengeLevel(1, 0, true)).toEqual({level:1,streak:1});
    expect(nextChallengeLevel(1, 1, true)).toEqual({level:2,streak:0});
    expect(nextChallengeLevel(1, -1, false)).toEqual({level:1,streak:0});
    expect(nextChallengeLevel(3, 1, true)).toEqual({level:3,streak:0});
    expect(nextChallengeLevel(2, 1, false)).toEqual({level:2,streak:-1});
  });
  it("ends the decider after a single completed hole", () => {
    expect(advanceChallenge(createChallenge("decider", 3), 2).remaining).toBe(0);
  });
});
