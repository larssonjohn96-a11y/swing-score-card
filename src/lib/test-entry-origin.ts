/** Origin of a navigation into a standalone test/exercise route. */
export type TestEntryOrigin = "tester" | undefined;

export function parseTestEntryOrigin(value: unknown): TestEntryOrigin {
  return value === "tester" ? "tester" : undefined;
}

/** Where the back button of the 25-ball putting exercise should return to. */
export function fiftyBallBackTarget(from: TestEntryOrigin) {
  return from === "tester"
    ? ({ to: "/standardiserade-tester", search: {} } as const)
    : ({ to: "/traning", search: { category: "putting" } } as const);
}
