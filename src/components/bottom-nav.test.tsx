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

describe("five equal SG4 navigation tabs", () => {
  it("renders exactly five links with equal tracks and no plus or menu interaction", () => {
    state.pathname = "/spel";
    const html = renderToStaticMarkup(<BottomNavVisibilityProvider><BottomNav /></BottomNavVisibilityProvider>);
    expect(BOTTOM_TABS.map(tab => tab.label)).toEqual(["Hem", "HCP-test", "Spel", "Match", "Analys"]);
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