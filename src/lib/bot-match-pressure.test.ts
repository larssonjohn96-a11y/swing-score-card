import { describe, expect, it } from "vitest";
import { getPlayerPressureNotice } from "./bot-match-pressure";

describe("bot match pressure", () => {
  it("shows pressure when the player must win", () => {
    expect(getPlayerPressureNotice(-2, 2, "Sarah")).toContain("Du måste vinna hålet");
  });

  it("shows pressure when the player must win or tie", () => {
    expect(getPlayerPressureNotice(-1, 2, "Sarah")).toContain("vinna eller dela");
  });

  it("shows pressure on an all-square final hole", () => {
    expect(getPlayerPressureNotice(0, 1, "Sarah")).toBe("Sista hålet avgör matchen.");
  });

  it("does not show pressure just because the bot is under pressure", () => {
    expect(getPlayerPressureNotice(2, 2, "Sarah")).toBeNull();
    expect(getPlayerPressureNotice(1, 2, "Sarah")).toBeNull();
  });
});
