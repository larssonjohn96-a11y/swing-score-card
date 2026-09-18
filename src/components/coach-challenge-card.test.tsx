import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoachChallengeCard } from "./coach-challenge-card";
import { createChallenge } from "@/lib/coach-challenges";
const render = (left: number, challenge = null as ReturnType<typeof createChallenge> | null) =>
  renderToStaticMarkup(createElement(CoachChallengeCard, { left, total: 5, challenge, feedback: "", onSkip: () => {}, disabled: false }));
describe("challenge visibility", () => {
  it("does not reveal the challenge at the beginning of a cycle", () => {
    for (const left of [3, 4, 5]) expect(render(left)).toBe("");
  });
  it("shows only the last two countdown holes", () => {
    expect(render(2)).toContain("Coach Challenge om 2 hål");
    expect(render(1)).toContain("Coach Challenge om 1 hål");
  });
  it("announces the active challenge with a heading and instructions", () => {
    const html = render(1, createChallenge("pace", 1));
    expect(html).toContain("<h2");
    expect(html).toContain("Fartkontroll");
    expect(html).toContain("Stanna inom");
    expect(html).not.toContain("Coach Challenge om");
  });
});
