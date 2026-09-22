import { describe, expect, it } from "vitest";
import { fiftyBallBackTarget, parseTestEntryOrigin } from "./test-entry-origin";

describe("test entry origin", () => {
  it("only accepts the tester origin", () => {
    expect(parseTestEntryOrigin("tester")).toBe("tester");
    expect(parseTestEntryOrigin("traning")).toBeUndefined();
    expect(parseTestEntryOrigin(undefined)).toBeUndefined();
  });

  it("returns to the standardized tests library when entered from Tests", () => {
    expect(fiftyBallBackTarget("tester")).toEqual({ to: "/standardiserade-tester", search: {} });
  });

  it("keeps the legacy training library as default back target", () => {
    expect(fiftyBallBackTarget(undefined)).toEqual({ to: "/traning", search: { category: "putting" } });
  });
});
