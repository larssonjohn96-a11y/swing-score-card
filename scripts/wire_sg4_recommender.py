from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected block not found")
    return text.replace(old, new, 1)


# Blend fast behavioral feedback into the long-term player model.
p = Path("src/lib/sg4-engine.ts")
t = p.read_text()
t = replace_once(
    t,
    'import type { TestSession } from "@/lib/sessions/types";\n',
    'import type { TestSession } from "@/lib/sessions/types";\nimport { getBehaviorRecommendationScore, recordRecommendationCompletion, recordRecommendationSignal } from "@/lib/sg4-recommender";\n',
    "engine recommender import",
)
t = replace_once(
    t,
    '  recordActivity(model, outcome.activityId);\n\n  if (typeof outcome.distance === "number") {',
    '  recordActivity(model, outcome.activityId);\n  if (outcome.activityId) recordRecommendationSignal(outcome.activityId, "engage");\n\n  if (typeof outcome.distance === "number") {',
    "engine game engagement",
)
t = replace_once(
    t,
    '  model.seenSessionIds = [...model.seenSessionIds, session.id].slice(-SESSION_ID_LIMIT);\n  recordActivity(model, session.testId);\n',
    '  model.seenSessionIds = [...model.seenSessionIds, session.id].slice(-SESSION_ID_LIMIT);\n  recordActivity(model, session.testId);\n  recordRecommendationCompletion(session.testId);\n',
    "engine completion signal",
)
old = '''      const profile = model.activities[item.id];
      const affinity = profile?.affinity ?? 0.42;
      const learningNeed = skillLearningNeed(model, item.engineSkill);
      const novelty = 0.7 + dayNoise(item.id) * 0.3;
      const funScore = affinity * 0.58 + novelty * 0.42;
      const learningScore = learningNeed * 0.78 + novelty * 0.22;
      const score = objective === "fun"
        ? funScore
        : objective === "learning"
          ? learningScore
          : funScore * 0.45 + learningScore * 0.55;'''
new = '''      const profile = model.activities[item.id];
      const affinity = profile?.affinity ?? 0.42;
      const learningNeed = skillLearningNeed(model, item.engineSkill);
      const behavior = getBehaviorRecommendationScore(item.id);
      const dayVariation = 0.85 + dayNoise(item.id) * 0.15;
      const funScore =
        behavior.affinity * 0.44 +
        behavior.novelty * 0.18 +
        behavior.exploration * 0.18 +
        affinity * 0.15 +
        dayVariation * 0.05;
      const learningScore =
        learningNeed * 0.62 +
        behavior.exploration * 0.16 +
        behavior.completionRate * 0.1 +
        behavior.novelty * 0.08 +
        dayVariation * 0.04;
      const score = objective === "fun"
        ? funScore
        : objective === "learning"
          ? learningScore
          : funScore * 0.52 + learningScore * 0.48;'''
t = replace_once(t, old, new, "engine activity ranking")
p.write_text(t)


# Training page supplies impressions and opens. Completion comes from the shared
# session save layer so every standardized test uses the same signal pipeline.
p = Path("src/routes/traning.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { useState } from "react";\nimport { rankEngineActivities, type EngineSkill } from "@/lib/sg4-engine";\n',
    'import { useEffect, useState } from "react";\nimport { rankEngineActivities, type EngineSkill } from "@/lib/sg4-engine";\nimport { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
    "training recommender imports",
)
t = replace_once(
    t,
    '    <Link\n      to={to}\n      className="group flex w-full items-center gap-4 rounded-3xl border border-slate-300/80 bg-gradient-to-br from-slate-100/88 via-white/78 to-slate-100/72 p-4 text-left shadow-[0_18px_44px_-32px_rgba(15,23,42,.4)] backdrop-blur-2xl transition-all active:scale-[0.99]"\n',
    '    <Link\n      to={to}\n      onClick={() => recordRecommendationOpen(to)}\n      className="group flex w-full items-center gap-4 rounded-3xl border border-slate-300/80 bg-gradient-to-br from-slate-100/88 via-white/78 to-slate-100/72 p-4 text-left shadow-[0_18px_44px_-32px_rgba(15,23,42,.4)] backdrop-blur-2xl transition-all active:scale-[0.99]"\n',
    "training open signal",
)
marker = '''  const visibleTests = category
    ? rankEngineActivities(
        baseVisibleTests.map((test) => ({ ...test, id: test.to, engineSkill: CATEGORY_ENGINE_SKILL[category] })),
        "learning",
      )
    : [];
'''
replacement = marker + '''  const visibleTestKey = visibleTests.map((test) => test.to).join("|");
  useEffect(() => {
    if (visibleTestKey) recordRecommendationImpressions(visibleTestKey.split("|"));
  }, [visibleTestKey]);
'''
t = replace_once(t, marker, replacement, "training impression hook")
p.write_text(t)
