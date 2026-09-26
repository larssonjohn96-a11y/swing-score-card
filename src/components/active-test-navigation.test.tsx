import React, { type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ subscribe: undefined as undefined | ((listener: () => void) => () => void) }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useSyncExternalStore: (subscribe: typeof store.subscribe, snapshot: () => boolean) => {
    store.subscribe = subscribe;
    return snapshot();
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
}));
import { ActivityStickyHeader } from "./activity-sticky-header";

afterEach(() => vi.unstubAllGlobals());

describe("active test navigation", () => {
  it.each(["/speedrundan", "/longdrive", "/driverrundan", "/inspelsrundan", "/chipprundan", "/puttrundan"])(
    "%s replaces Back with a right-hand abort button only after starting", (pathname) => {
      const dataset = { sg4TestActive: "false" };
      vi.stubGlobal("document", { documentElement: { dataset } });
      const render = () => renderToStaticMarkup(<ActivityStickyHeader pathname={pathname} />);
      expect(render()).toContain("data-dynamic-back");
      expect(render()).not.toContain("data-test-abort");
      dataset.sg4TestActive = "true";
      const active = render();
      expect(active).not.toContain("data-dynamic-back");
      expect(active).toContain('aria-label="Avbryt test"');
      expect(active.match(/<button\b/g)).toHaveLength(1);
      expect(active.indexOf("data-test-abort")).toBeGreaterThan(active.indexOf("</p>"));
      dataset.sg4TestActive = "false";
      expect(render()).toContain("data-dynamic-back");
    },
  );

  it("subscribes to test state mutations and disconnects on unmount", () => {
    const root = { dataset: { sg4TestActive: "false" } };
    vi.stubGlobal("document", { documentElement: root });
    let notify: (() => void) | undefined;
    const observe = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal("MutationObserver", class {
      constructor(callback: () => void) { notify = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    renderToStaticMarkup(<ActivityStickyHeader pathname="/speedrundan" />);
    const listener = vi.fn();
    const unsubscribe = store.subscribe!(listener);
    expect(observe).toHaveBeenCalledWith(root, { attributes: true, attributeFilter: ["data-sg4-test-active"] });
    root.dataset.sg4TestActive = "true";
    notify!();
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
