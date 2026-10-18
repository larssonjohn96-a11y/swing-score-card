import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NineShotChipTest } from "./nine-shot-chip-test";
import { BunkerHcpTest } from "./bunker-hcp-test";
import { NineHolePuttingTest } from "./nine-hole-putting-test";

describe("HCP test entry screens", () => {
  it("opens chipping before a completed round exists", () => {
    expect(renderToStaticMarkup(<NineShotChipTest onExit={() => {}} />)).toContain("Starta chippningstest");
  });
  it("opens bunker as a six-shot test", () => {
    const html = renderToStaticMarkup(<BunkerHcpTest onExit={() => {}} />);
    expect(html).toContain("Starta bunkertest");
    expect(html).toContain("6 slag");
  });
  it("opens the new short putting protocol", () => {
    expect(renderToStaticMarkup(<NineHolePuttingTest modeKey="short" testTitle="Kortputt" rangeLabel="1–4 m" distances={[1,1.5,2,3,4,1.5,2,3,4]} shuffleDistances={false} onExit={() => {}} />)).toContain("1–4 m");
  });
});
