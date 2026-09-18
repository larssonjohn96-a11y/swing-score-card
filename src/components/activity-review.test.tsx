import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivityReview } from "./activity-review";
import { ACTIVITY_CATEGORIES, shortGameReviewInput } from "@/lib/activity-review";

vi.mock("./activity-review-shell", () => ({
  ActivityReviewShell: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

describe("shared detailed activity review", () => {
  it("renders the full category breakdown and both highlights for chip", () => {
    const html = renderToStaticMarkup(createElement(ActivityReview, {
      input: shortGameReviewInput("Chip", [{ distance: 15, points: 5 }, { distance: 10, points: 0 }]),
    }));
    for (const category of ACTIVITY_CATEGORIES) expect(html).toContain(category);
    expect(html).toContain("Bästa slaget i passet");
    expect(html).toContain("Största tappet i passet");
    expect(html).toContain("Slag 1");
    expect(html).toContain("Slag 2");
  });
  it("does not fabricate best/worst highlights from missing measurements", () => {
    const html = renderToStaticMarkup(createElement(ActivityReview, {
      input: { title: "Test", outcomes: [{ label: "Slag 1", result: "Registrerat" }] },
    }));
    expect(html).toContain("saknar tillräckligt underlag");
    expect(html).not.toContain("Bästa slaget i passet");
    expect(html).not.toContain("Största tappet i passet");
  });
});
