import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseScorecard } from "./course-scorecard";
import type { CourseGame } from "@/lib/short-course";
it("marks the net winner while showing actual strokes, plus shared holes", () => {
  const game: CourseGame = {
    mode: "friend",
    format: "match",
    names: ["John", "Fredrik"],
    holes: 3,
    allowance: 2,
    recipient: "other",
    botLevel: 1,
    rolls: [0.5, 0.5, 0.5],
    scores: [
      { you: 3, other: 3, length: 100 },
      { you: 4, other: 5, length: 100 },
      { you: 3, other: 3, length: 100 },
    ],
    draft: { you: 3, other: 3, length: 100 },
  };
  const html = renderToStaticMarkup(createElement(CourseScorecard, { game }));
  expect(html).toContain("Fredrik, hål 1: 3 slag, vann hålet");
  expect(html).toContain("John, hål 1: 3 slag, förlorade hålet");
  expect(html).toContain("bg-red-600 text-white");
  expect(html).toContain("delat hål");
  expect(html).not.toContain("Du");
});
