import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

// Exercise the actual navigation handlers without adding a DOM-test dependency.
// This is source-level integration coverage, not a browser rendering test.
const analysis = readFileSync(resolve(process.cwd(), "src/components/speed-challenge-analysis.tsx"), "utf8");
const reveal = readFileSync(resolve(process.cwd(), "src/components/speed-level-reveal.tsx"), "utf8");
const start = analysis.indexOf("  const nextBlocked =");
const end = analysis.indexOf("  return (\n    <Dialog", start);
assert.ok(start >= 0 && end > start, "Locate the current navigation handlers");
const handlers = ts.transpileModule(analysis.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const makeHandlers = new Function(
  "story", "currentStory", "lastStory", "revealComplete", "levelComplete",
  "setLevelComplete", "setStory", "touch",
  `${handlers}\nreturn { next, previous };`,
) as (...args: unknown[]) => { next: () => void; previous: () => void };

function navigation(index: number, hcpComplete: boolean, levelComplete: boolean) {
  const stories = ["hcp", "age", "all", "distance", "level"];
  const state = { index, levelComplete, touch: { current: { x: 1, y: 1 } as { x: number; y: number } | null } };
  function render() {
    return makeHandlers(state.index, stories[state.index], stories.length - 1, hcpComplete, state.levelComplete,
      (done: boolean) => { state.levelComplete = done; },
      (nextIndex: number) => { state.index = nextIndex; }, state.touch);
  }
  return { state, next: () => render().next(), previous: () => render().previous() };
}

describe("speed reveal navigation integration", () => {
  it("blocks forward navigation during the current reveal", () => {
    const n = navigation(1, true, false);
    n.next(); assert.equal(n.state.index, 1);
  });
  it("allows backward navigation while the reveal is running", () => {
    const n = navigation(1, true, false);
    n.previous(); assert.equal(n.state.index, 0);
    assert.equal(n.state.touch.current, null);
  });
  it("resets the gate on return from the age story", () => {
    const n = navigation(2, true, true);
    n.previous(); assert.equal(n.state.index, 1);
    assert.equal(n.state.levelComplete, false);
    n.next(); assert.equal(n.state.index, 1);
    n.state.levelComplete = true;
    n.next(); assert.equal(n.state.index, 2);
  });
  it("keeps the original HCP reveal gate and terminal boundary", () => {
    const start = navigation(0, false, false);
    start.next(); start.previous(); assert.equal(start.state.index, 0);
    const end = navigation(4, true, true);
    end.next(); assert.equal(end.state.index, 4);
  });
  it("shares handlers across button, keyboard and swipe paths", () => {
    assert.ok(analysis.includes("onClick={next}"));
    assert.ok(analysis.includes("onClick={previous}"));
    assert.ok(analysis.includes('if (dx < 0) next();'));
    assert.ok(analysis.includes('else previous();'));
    assert.ok(analysis.includes('if (event.key === "ArrowRight")'));
  });
  it("does not hide the back button with the forward-navigation gate", () => {
    const nav = analysis.match(/<nav\b[^>]*>/)?.[0] ?? "";
    assert.ok(nav.length > 0);
    assert.ok(!nav.includes("aria-hidden"));
    assert.ok(!nav.includes("invisible"));
    assert.ok(analysis.includes("disabled={nextBlocked}"));
  });
  it("uses a stable callback and remounts state for a new round", () => {
    assert.ok(analysis.includes("onComplete={onLevelComplete}"));
    assert.ok(analysis.includes("key={props.round.id}"));
    assert.ok(reveal.includes("completeCallback.current()"));
    assert.ok(reveal.includes("[active, validSpeed, high]"));
    assert.ok(!reveal.includes("[active, onComplete"));
  });
});
