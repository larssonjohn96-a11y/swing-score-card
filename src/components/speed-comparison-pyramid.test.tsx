import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeedComparisonPyramid, speedPyramidTier } from "./speed-comparison-pyramid";

describe("speed comparison pyramid", () => {
  it("assigns boundary results to exactly one tier", () => {
    expect([99, 98, 90, 89, 75, 74, 50, 49, 25, 24, 10, 9, 1].map(speedPyramidTier)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ]);
  });
  it("highlights only the top for an exceptional age-group result", () => {
    const html = renderToStaticMarkup(
      <SpeedComparisonPyramid
        title="Din åldersgrupp"
        ageGroup
        ballSpeed={170}
        mean={112}
        sd={10}
      />,
    );
    expect(html.match(/data-active="true"/g)).toHaveLength(1);
    expect(html.match(/data-active="false"/g)).toHaveLength(6);
    expect(html).toContain("Topp 1 % · Du");
    expect(html).toContain("absoluta toppen i din åldersgrupp");
    expect(html).not.toContain("bättre än");
  });
  it("encourages a top-75 age-group result without placing it at the base", () => {
    const html = renderToStaticMarkup(
      <SpeedComparisonPyramid title="Din åldersgrupp" ageGroup ballSpeed={95} mean={100} sd={10} />,
    );
    expect(html).toContain("Topp 75 % · Du");
    expect(html).toContain("Bra jobbat! Du är en bit på vägen i din åldersgrupp. Fortsätt så!");
    expect(html).not.toContain("Bas · Du");
    expect(html).not.toContain("data-chip-celebration");
  });
  it.each([[100, "subtle"], [115, "grand"]])("scales the celebration for ball speed %s", (ballSpeed, size) => {
    const html = renderToStaticMarkup(
      <SpeedComparisonPyramid title="Alla golfare" ballSpeed={Number(ballSpeed)} mean={100} sd={10} />,
    );
    expect(html).toContain(`data-celebration-size="${size}"`);
  });
});
