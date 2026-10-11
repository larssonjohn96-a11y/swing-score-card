import React, { type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { activeBottomTab, BOTTOM_TABS, hideBottomNavOnRoute } from "@/lib/bottom-nav-routes";
import { BottomNavVisibilityProvider } from "@/lib/bottom-nav-visibility";
import { GAME_SECTIONS } from "@/lib/game-catalogue";
import { getHubHeader } from "@/lib/hub-header";
import { readFileSync } from "node:fs";

const state = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => state,
  Link: ({ to, children, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
}));
import { BottomNav } from "./bottom-nav";
import { GameOverview } from "./game-overview";
import { TestCategoryTabs } from "./test-category-tabs";

describe("five equal SG4 navigation tabs", () => {
  it("renders exactly five links with equal tracks and no plus or menu interaction", () => {
    state.pathname = "/spel";
    const html = renderToStaticMarkup(<BottomNavVisibilityProvider><BottomNav /></BottomNavVisibilityProvider>);
    expect(BOTTOM_TABS.map(tab => tab.label)).toEqual(["Hem", "Testa", "Spel", "Match", "Analys"]);
    expect(html.match(/<a\b/g)).toHaveLength(5);
    expect(html).toContain("grid-cols-5");
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("lucide-plus");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    for (const tab of BOTTOM_TABS) expect(html).toContain(`href="${tab.to}"`);
  });
  it.each([
    ["/", "home"], ["/spela-runda/", "tests"], ["/inspelsrundan", "tests"], ["/chipprundan", "tests"],
    ["/kategori/approach", "tests"], ["/spel/", "games"], ["/spel/tee-round", "games"],
    ["/spela", "match"], ["/match-bot", "match"], ["/utveckling/approach", "analysis"], ["/jamfor/player", "analysis"],
  ])("assigns %s to %s", (path, tab) => expect(activeBottomTab(path)).toBe(tab));
  it("uses the requested golf, people and chart icons with matching stroke and size", () => {
    state.pathname = "/spel";
    const html = renderToStaticMarkup(<BottomNavVisibilityProvider><BottomNav /></BottomNavVisibilityProvider>);
    expect(html).toContain('data-nav-icon="hcp"');
    expect(html).toContain('data-nav-icon="golf-round"');
    expect(html).toContain("<ellipse");
    expect(html).toContain("lucide-house");
    expect(html).toContain("lucide-users-round");
    expect(html).toContain("lucide-chart-no-axes-column-increasing");
    for (const oldIcon of ["lucide-target", "lucide-flag", "lucide-swords", "lucide-git-compare-arrows"]) expect(html).not.toContain(oldIcon);
    const icons = html.match(/<svg\b[^>]*>/g) ?? [];
    expect(icons).toHaveLength(5);
    for (const icon of icons) {
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('stroke-width="2"');
      expect(icon).toContain("h-5 w-5");
    }
    expect(icons.filter(icon => icon.includes("stroke-[2.35]"))).toHaveLength(1);
    expect(icons.filter(icon => icon.includes("stroke-[1.9]"))).toHaveLength(4);
  });
  it("preserves intentional full-screen activity exclusions, not analysis routes", () => {
    for (const path of ["/match", "/match-bot", "/learn/putting", "/putting-streak", "/shot-shaping-konstant"]) expect(hideBottomNavOnRoute(path)).toBe(true);
    for (const path of ["/", "/spel", "/spela", "/spela-runda", "/utveckling/approach"]) expect(hideBottomNavOnRoute(path)).toBe(false);
  });
  it.each(["/utveckling", "/utveckling/", "/utveckling?tab=analys", "/utveckling?tab=jamfor", "/utveckling/?tab=sank"])("shows five tabs with Analys active on %s", (path) => {
    state.pathname = path;
    expect(hideBottomNavOnRoute(path)).toBe(false);
    expect(activeBottomTab(path)).toBe("analysis");
    const html = renderToStaticMarkup(<BottomNavVisibilityProvider><BottomNav /></BottomNavVisibilityProvider>);
    expect(html.match(/<a\b/g)).toHaveLength(5);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/href="\/utveckling" aria-current="page"/);
  });
});

describe("Testa hub category navigation", () => {
  it.each([
    ["hcp", "/spela-runda"],
    ["advanced", "/standardiserade-tester"],
  ] as const)("shows both categories with %s active", (selected, activeTo) => {
    const html = renderToStaticMarkup(<TestCategoryTabs selected={selected} />);
    expect(html).toContain('aria-label="Typ av tester"');
    expect(html.match(/<a\\b/g)).toHaveLength(2);
    expect(html).toContain('href="/spela-runda"');
    expect(html).toContain('href="/standardiserade-tester"');
    expect(html).toContain("HCP-tester");
    expect(html).toContain("Avancerade tester");
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(`href="${activeTo}" aria-current="page"`);
  });

  it("keeps both original test pages and removes the duplicate header", () => {
    const hcp = readFileSync("src/routes/spela-runda.tsx", "utf8");
    const advanced = readFileSync("src/routes/standardiserade-tester.tsx", "utf8");
    expect(hcp).toContain('<TestCategoryTabs selected="hcp" />');
    expect(advanced).toContain('<TestCategoryTabs selected="advanced" />');
    expect(hcp).not.toContain("<header");
    expect(advanced).not.toContain("<header");
    expect(advanced).not.toContain("ArrowLeft");
    expect(getHubHeader("/spela-runda")?.title).toBe("Testa");
    expect(getHubHeader("/standardiserade-tester")?.title).toBe("Testa");
    expect(activeBottomTab("/standardiserade-tester")).toBe("tests");
  });
});

describe("standalone Spel overview", () => {
  it("keeps the requested categories and five future games, without assessment links or a duplicate header", () => {
    const html = renderToStaticMarkup(<GameOverview />);
    expect(GAME_SECTIONS.map(section => section.title)).toEqual(["Puttning", "Inspel", "Närspel", "Utslag"]);
    expect(html.match(/Kommer snart/g)).toHaveLength(5);
    expect(html.match(/<article\b/g)).toHaveLength(5);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<header");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("6 hål × 3 bollar · 18 chippar");
    expect(html).toContain("9 hål · par 18");
    expect(getHubHeader("/spel")?.title).toBe("Spel");
    expect(readFileSync("src/routes/spela-runda.tsx", "utf8")).not.toContain("<header");
  });
});