import React, { type ComponentProps } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getHubHeader } from "@/lib/hub-header";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { ActivityStickyHeader } from "./activity-sticky-header";

const render = (pathname: string) =>
  renderToStaticMarkup(<ActivityStickyHeader pathname={pathname} />);
const routes = ["/spela-runda", "/standardiserade-tester", "/utveckling", "/spela"];

describe("shared sticky headers on SG4 hub pages", () => {
  it.each(routes)("provides one sticky home button and a title on %s", (pathname) => {
    const html = render(pathname);
    expect(html).toContain("data-activity-sticky-header");
    expect(html).toContain("sticky top-0");
    expect(html).toContain('href="/"');
    expect(html).toContain("data-local-navigation");
    expect(html).toContain('aria-label="Tillbaka till startsidan"');
    expect(html).not.toContain("data-dynamic-back");
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
    expect(getHubHeader(pathname)?.title.length).toBeGreaterThan(0);
  });

  it("uses precisely the Games button design on the other hub pages", () => {
    const buttonClass = (pathname: string) => render(pathname).match(/<a[^>]*class="([^"]*)"/)?.[1];
    const expected = buttonClass("/spela-runda");
    expect(expected).toBeTruthy();
    for (const pathname of routes) expect(buttonClass(pathname)).toBe(expected);
  });

  it("supports trailing-slash index URLs and preserves the correct page titles", () => {
    for (const pathname of routes) expect(render(`${pathname}/`)).toBe(render(pathname));
    expect(render("/standardiserade-tester")).toContain("Standardiserade tester");
    expect(render("/utveckling/")).toContain("Analys &amp; utveckling");
    expect(render("/spela")).toContain("Match");
  });

  it("keeps safe-area padding outside the fixed-height content row", () => {
    const html = render("/spela");
    expect(html.match(/<header[^>]*>/)?.[0]).toContain("pt-[env(safe-area-inset-top)]");
    const row = html.match(/<div[^>]*>/)?.[0] ?? "";
    expect(row).toContain("h-[58px]");
    expect(row).not.toContain("pt-[env");
  });

  it("does not reroute active games or add headers to Home", () => {
    for (const pathname of ["/", "/match", "/match-bot", "/utveckling/driving"]) {
      expect(getHubHeader(pathname)).toBeNull();
      expect(render(pathname)).toBe("");
    }
    const game = render("/speedrundan");
    expect(game).toContain("Ball Speed Challenge");
    expect(game).toContain("data-dynamic-back");
    expect(game).not.toContain('href="/"');
  });

  it("mounts once outside route animations and keeps direct home links out of global interception", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root.match(/<ActivityStickyHeader\b/g)).toHaveLength(1);
    expect(root.indexOf("<ActivityStickyHeader")).toBeLessThan(
      root.indexOf('className="sg4-route-transition"'),
    );
    expect(root).toContain('control.hasAttribute("data-local-navigation")');
    expect(root).not.toContain("function ActivityStickyHeader");
  });

  it("removes the duplicate Match header while preserving every match option", () => {
    const match = readFileSync("src/routes/spela.tsx", "utf8");
    expect(match).not.toContain("HomeArrowIcon");
    expect(match).not.toContain("<header");
    expect(match).toContain('href="/match?flow=friend"');
    expect(match).toContain('href="/match-bot"');
    expect(match).toContain('href="/match?flow=team"');
    const tests = readFileSync("src/routes/standardiserade-tester.tsx", "utf8");
    expect(tests).not.toContain("<header");
    expect(tests).not.toContain("ArrowLeft");
    const analysis = readFileSync("src/routes/utveckling.index.tsx", "utf8");
    expect(analysis).toContain('<h1 className="sr-only">Analys & utveckling</h1>');
  });
});
