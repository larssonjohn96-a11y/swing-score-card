import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeedComparisonPyramid, speedPyramidTier } from "./speed-comparison-pyramid";

describe("speed comparison pyramid", () => {
  it("assigns boundary results to exactly one tier", () => {
    expect([99, 98, 90, 89, 75, 74, 50, 49].map(speedPyramidTier)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4,
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
    expect(html.match(/data-active="false"/g)).toHaveLength(4);
    expect(html).toContain("Topp 1 % · Du");
    expect(html).toContain("absoluta toppen i din åldersgrupp");
    expect(html).not.toContain("bättre än");
  });
});
