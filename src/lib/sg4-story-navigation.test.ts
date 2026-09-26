import { describe, expect, it } from "vitest";
import { isStoryDrag, moveStory, shouldDismissStory } from "./sg4-story-navigation";

const start = { x: 150, y: 100, time: 0 };

describe("highlight story navigation", () => {
  it("advances and goes back within a category", () => {
    expect(moveStory([3, 4], { group: 0, slide: 0 }, 1)).toEqual({ group: 0, slide: 1 });
    expect(moveStory([3, 4], { group: 0, slide: 1 }, -1)).toEqual({ group: 0, slide: 0 });
  });
  it("crosses categories in either direction", () => {
    expect(moveStory([3, 4], { group: 0, slide: 2 }, 1)).toEqual({ group: 1, slide: 0 });
    expect(moveStory([3, 4], { group: 1, slide: 0 }, -1)).toEqual({ group: 0, slide: 2 });
  });
  it("stays on the first slide when going back", () => {
    expect(moveStory([3, 4], { group: 0, slide: 0 }, -1)).toEqual({ group: 0, slide: 0 });
  });
  it("closes after the last slide, including a single-category process story", () => {
    expect(moveStory([3, 4], { group: 1, slide: 3 }, 1)).toBeNull();
    expect(moveStory([5], { group: 0, slide: 4 }, 1)).toBeNull();
  });
  it("skips empty groups without indexing an absent story", () => {
    expect(moveStory([2, 0, 3], { group: 0, slide: 1 }, 1)).toEqual({ group: 2, slide: 0 });
    expect(moveStory([2, 0, 3], { group: 2, slide: 0 }, -1)).toEqual({ group: 0, slide: 1 });
  });
  it("rejects an invalid position", () => {
    expect(moveStory([], { group: 0, slide: 0 }, 1)).toBeNull();
    expect(moveStory([2], { group: 0, slide: 5 }, 1)).toBeNull();
  });
});

describe("swipe down to dismiss", () => {
  it("dismisses a deliberate downward drag", () => {
    expect(shouldDismissStory(start, { x: 155, y: 260, time: 700 }, 800)).toBe(true);
  });
  it("dismisses a short but decisive downward flick", () => {
    expect(shouldDismissStory(start, { x: 151, y: 160, time: 70 }, 800)).toBe(true);
  });
  it("snaps back after a slow, short drag", () => {
    expect(shouldDismissStory(start, { x: 151, y: 160, time: 500 }, 800)).toBe(false);
  });
  it("never dismisses a tap, upward swipe, or horizontal swipe", () => {
    expect(shouldDismissStory(start, { x: 151, y: 102, time: 2 }, 800)).toBe(false);
    expect(shouldDismissStory(start, { x: 151, y: -80, time: 200 }, 800)).toBe(false);
    expect(shouldDismissStory(start, { x: 310, y: 140, time: 150 }, 800)).toBe(false);
  });
  it("rejects diagonal movement that is not mostly downward", () => {
    expect(shouldDismissStory(start, { x: 280, y: 230, time: 150 }, 800)).toBe(false);
  });
  it("scales the dismissal distance to small screens", () => {
    expect(shouldDismissStory(start, { x: 150, y: 200, time: 700 }, 568)).toBe(true);
    expect(shouldDismissStory(start, { x: 150, y: 170, time: 700 }, 568)).toBe(false);
  });
  it("distinguishes small tap jitter from a drag in any direction", () => {
    expect(isStoryDrag(start, { x: 152, y: 103, time: 100 })).toBe(false);
    expect(isStoryDrag(start, { x: 170, y: 100, time: 100 })).toBe(true);
    expect(isStoryDrag(start, { x: 150, y: 60, time: 100 })).toBe(true);
  });
});
