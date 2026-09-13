from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected block not found")
    return text.replace(old, new, 1)


# Every standardized/saved test teaches the same player model.
p = Path("src/lib/sessions/sync.ts")
t = p.read_text()
t = replace_once(
    t,
    'import { cloudIdFor } from "./ids";\n',
    'import { cloudIdFor } from "./ids";\nimport { recordEngineSession, recordEngineSessions } from "@/lib/sg4-engine";\n',
    "sync import",
)
t = replace_once(
    t,
    '  const session = canonicalize(testId, record);\n  if (!session) return null;\n  enqueueUpsert(session);',
    '  const session = canonicalize(testId, record);\n  if (!session) return null;\n  recordEngineSession(session);\n  enqueueUpsert(session);',
    "sync saved session hook",
)
t = replace_once(
    t,
    '    const cloud = await gateway.fetchAll(userId);\n    report.fetched = cloud.length;',
    '    const cloud = await gateway.fetchAll(userId);\n    recordEngineSessions(cloud);\n    report.fetched = cloud.length;',
    "sync historical session hook",
)
p.write_text(t)


# Training lists are silently ordered for learning value; no algorithm UI.
p = Path("src/routes/traning.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { useState } from "react";\nimport { LIGHT_SURFACE } from "./8-bollar";',
    'import { useState } from "react";\nimport { rankEngineActivities, type EngineSkill } from "@/lib/sg4-engine";\nimport { LIGHT_SURFACE } from "./8-bollar";',
    "training import",
)
t = replace_once(
    t,
    'const CATEGORY_IDS: Category[] = ["off-the-tee", "approach", "around-the-green", "putting"];\n',
    'const CATEGORY_IDS: Category[] = ["off-the-tee", "approach", "around-the-green", "putting"];\nconst CATEGORY_ENGINE_SKILL: Record<Category, EngineSkill> = {\n  "off-the-tee": "driver",\n  approach: "approach",\n  "around-the-green": "chip",\n  putting: "putting",\n};\n',
    "training category map",
)
t = replace_once(
    t,
    '  const visibleTests = category === "putting" ? TESTS.putting.filter((test) => matchesPuttingFilter(test, puttingFilter)) : category ? TESTS[category] : [];',
    '  const baseVisibleTests = category === "putting" ? TESTS.putting.filter((test) => matchesPuttingFilter(test, puttingFilter)) : category ? TESTS[category] : [];\n  const visibleTests = category\n    ? rankEngineActivities(\n        baseVisibleTests.map((test) => ({ ...test, id: test.to, skill: CATEGORY_ENGINE_SKILL[category] })),\n        "learning",\n      )\n    : [];',
    "training ranking",
)
p.write_text(t)


# Casual Match Play: learn the local player and adapt the next shared challenge
# from both players' result. Both still play the exact same challenge.
p = Path("src/routes/match.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand, getChipPointZone } from "@/lib/chip-match";\n',
    'import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand, getChipPointZone } from "@/lib/chip-match";\nimport { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance } from "@/lib/sg4-engine";\n',
    "match engine import",
)
t = replace_once(
    t,
    'function bunkerLimit(length: MatchLength) { return length === 3 ? 1 : length === 5 ? 1 : 2; }\n',
    'function bunkerLimit(length: MatchLength) { return length === 3 ? 1 : length === 5 ? 1 : 2; }\nfunction holeDistance(hole?: Hole) {\n  const value = Number.parseFloat(hole?.challenge.title ?? "");\n  return Number.isFinite(value) ? value : undefined;\n}\n',
    "match distance helper",
)
marker = "  function recordPutting() {\n"
helper = """  function adaptNextChallenge(next: Hole[], registered: number, performance: number) {
    if (!category || !mode || registered >= next.length - 1) return next;
    if (category !== "putting" && category !== "around-the-green") return next;
    const currentDistance = holeDistance(next[registered]);
    if (typeof currentDistance !== "number") return next;
    const skill = category === "putting" ? "putting" : "chip";
    const nextDistance = selectNextEngineDistance({
      skill,
      objective: "balanced",
      min: category === "putting" ? 1 : 8,
      max: category === "putting" ? 22 : 30,
      previousDistance: currentDistance,
      previousPerformance: performance,
    });
    const nextIndex = registered + 1;
    const adapted = [...next];
    adapted[nextIndex] = {
      ...adapted[nextIndex],
      challenge: generateChallenge(category, matchType ?? "closest", mode, shortGameLies, nextDistance),
    };
    return adapted;
  }
"""
if marker not in t:
    raise SystemExit("match adaptive helper marker not found")
t = t.replace(marker, helper + marker, 1)
t = replace_once(
    t,
    '    const winner: Exclude<HoleWinner, null> = blueStrokes < redStrokes ? "blue" : redStrokes < blueStrokes ? "red" : "tie";\n    const next = holes.map((h, i) => i === registered ? { ...h, winner, blueStrokes, redStrokes } : h);',
    '    const winner: Exclude<HoleWinner, null> = blueStrokes < redStrokes ? "blue" : redStrokes < blueStrokes ? "red" : "tie";\n    const selfPerformance = puttingPerformanceFromStrokes(blueStrokes);\n    if (editingHoleIndex === null) {\n      recordEngineOutcome({ skill: "putting", distance: holeDistance(holes[registered]), performance: selfPerformance, context: "game", activityId: "putting-match" });\n    }\n    const scored = holes.map((h, i) => i === registered ? { ...h, winner, blueStrokes, redStrokes } : h);\n    const matchPerformance = (selfPerformance + puttingPerformanceFromStrokes(redStrokes)) / 2;\n    const next = editingHoleIndex === null ? adaptNextChallenge(scored, registered, matchPerformance) : scored;',
    "match putting outcome",
)
t = replace_once(
    t,
    '    const winner: Exclude<HoleWinner, null> = bluePoints > redPoints ? "blue" : redPoints > bluePoints ? "red" : "tie";\n    const next = holes.map((h, i) => i === registered ? { ...h, winner, bluePoints, redPoints } : h);',
    '    const winner: Exclude<HoleWinner, null> = bluePoints > redPoints ? "blue" : redPoints > bluePoints ? "red" : "tie";\n    const selfPerformance = chipPerformanceFromPoints(bluePoints);\n    if (editingHoleIndex === null) {\n      recordEngineOutcome({ skill: "chip", distance: holeDistance(holes[registered]), performance: selfPerformance, context: "game", activityId: "chip-match" });\n    }\n    const scored = holes.map((h, i) => i === registered ? { ...h, winner, bluePoints, redPoints } : h);\n    const matchPerformance = (selfPerformance + chipPerformanceFromPoints(redPoints)) / 2;\n    const next = editingHoleIndex === null ? adaptNextChallenge(scored, registered, matchPerformance) : scored;',
    "match chip outcome",
)
p.write_text(t)


# Bot matches: player result immediately changes the next putt/chip challenge.
p = Path("src/routes/match-bot.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand } from "@/lib/chip-match";\n',
    'import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand } from "@/lib/chip-match";\nimport { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance } from "@/lib/sg4-engine";\n',
    "bot engine import",
)
old = """    const lockedDriveHit = driveHit;
    setHoles((prev) => prev.map((h, i) =>
      i === holeIndex ? { ...h, yourValue: lockedYourValue, yourHit: lockedDriveHit, yourApproach: lockedApproach } : h,
    ));"""
new = """    const lockedDriveHit = driveHit;
    const engineSkill = category === "putting" ? "putting" : category === "around-the-green" ? "chip" : null;
    const enginePerformance = category === "putting"
      ? puttingPerformanceFromStrokes(lockedYourValue)
      : category === "around-the-green"
        ? chipPerformanceFromPoints(lockedYourValue)
        : null;
    let adaptiveNextDistance: number | null = null;
    if (engineSkill && enginePerformance !== null) {
      recordEngineOutcome({
        skill: engineSkill,
        distance: current.distance,
        performance: enginePerformance,
        context: "game",
        activityId: engineSkill === "putting" ? "putting-match" : "chip-match",
      });
      if (holeIndex < holes.length - 1 && typeof current.distance === "number") {
        adaptiveNextDistance = selectNextEngineDistance({
          skill: engineSkill,
          objective: "balanced",
          min: engineSkill === "putting" ? 1 : 8,
          max: engineSkill === "putting" ? 22 : 30,
          previousDistance: current.distance,
          previousPerformance: enginePerformance,
        });
      }
    }
    setHoles((prev) => prev.map((h, i) => {
      if (i === holeIndex) return { ...h, yourValue: lockedYourValue, yourHit: lockedDriveHit, yourApproach: lockedApproach };
      if (i === holeIndex + 1 && adaptiveNextDistance !== null) {
        if (engineSkill === "putting") {
          return { ...h, title: formatPuttingDistance(adaptiveNextDistance), distance: adaptiveNextDistance, detail: "Samma position för båda · färre puttar vinner hålet" };
        }
        const band = getChipDistanceBand(adaptiveNextDistance);
        return { ...h, title: `${adaptiveNextDistance} m`, distance: adaptiveNextDistance, detail: `${band.label} · ${band.range} · samma avstånd för båda` };
      }
      return h;
    }));"""
t = replace_once(t, old, new, "bot adaptive outcome")
p.write_text(t)
