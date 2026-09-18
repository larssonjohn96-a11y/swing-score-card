import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PuttingMatchReview } from "./putting-match-review";
import type { ReviewHole } from "@/lib/putting-match-review";

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({ canViewDetailedBreakdowns: true }),
}));

const hole = (distance: number, yourValue: number): ReviewHole => ({
  distance,
  yourValue,
  winner: "you",
});
const render = (holes: ReviewHole[]) =>
  renderToStaticMarkup(createElement(PuttingMatchReview, { holes }));

describe("putting review invitation", () => {
  it("uses a training CTA when reviewing a coach session", () => {
    const html = renderToStaticMarkup(
      createElement(PuttingMatchReview, {
        holes: [hole(1, 1), hole(5, 2), hole(12, 2)],
        activity: "training",
      }),
    );
    expect(html).toContain("Visa passanalys");
    expect(html).not.toContain("Visa matchanalys");
  });
  it("highlights both exceptional results and large losses with a clear CTA", () => {
    const html = render([hole(15, 1), hole(1, 3), hole(5, 2)]);
    expect(html).toContain("Du satte den från 15 m");
    expect(html).toContain("1 exceptionellt hål");
    expect(html).toContain("stort tapp");
    expect(html).toContain("Visa matchanalys");
    expect(html).not.toContain("Preliminär nivå");
    expect(html).not.toContain("låg tillförlitlighet");
  });
  it("does not invent highlights for ordinary results", () => {
    const html = render([hole(5, 2), hole(5, 2), hole(5, 2)]);
    expect(html).toContain("Upptäck detaljerna bakom din nivå");
    expect(html).not.toContain("exceptionellt hål");
    expect(html).not.toContain("stort tapp");
  });
  it("uses plural copy for multiple exceptional holes", () => {
    expect(render([hole(15, 1), hole(12, 1), hole(5, 2)])).toContain("2 exceptionella hål");
  });
});
