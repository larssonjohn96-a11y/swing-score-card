import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseStrokeInput, CourseMatchBar } from "./course-match-ui";
import { CoursePressure } from "./course-celebration";
it("offers native stroke choices only through twelve", () => {
  const html = renderToStaticMarkup(
    createElement(CourseStrokeInput, { name: "John", value: 3, onChange: () => {} }),
  );
  expect(html).toContain('value="8"');
  expect(html).toContain('value="12"');
  expect(html).not.toContain('value="13"');
});
it("shows both stroke totals and the leading margin", () => {
  const html = renderToStaticMarkup(
    createElement(CourseMatchBar, {
      names: ["John", "Fredrik"],
      holes: 6,
      current: 2,
      results: [1, 0],
      margin: 2,
      format: "stroke",
      strokeTotals: [7, 9],
    }),
  );
  expect(html).toContain("7");
  expect(html).toContain("9");
  expect(html).toContain("slag totalt");
  expect(html).toContain("2 SLAG");
});
it("keeps pressure space without announcing stale pressure after registration", () => {
  const html = renderToStaticMarkup(
    createElement(CoursePressure, { text: "John kan avgöra", hidden: true }),
  );
  expect(html).toContain("visibility:hidden");
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain('role="status"');
});
