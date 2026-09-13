from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected block not found")
    return text.replace(old, new, 1)


# Keep the engine's internal skill key separate from the existing user-facing
# TestItem.skill label (e.g. "Challenge", "Scoring", "Power").
p = Path("src/lib/sg4-engine.ts")
t = p.read_text()
t = replace_once(
    t,
    'export type RankedActivity = {\n  id: string;\n  skill: EngineSkill;\n};',
    'export type RankedActivity = {\n  id: string;\n  engineSkill: EngineSkill;\n};',
    "engine ranking type",
)
t = replace_once(
    t,
    '      const learningNeed = skillLearningNeed(model, item.skill);',
    '      const learningNeed = skillLearningNeed(model, item.engineSkill);',
    "engine ranking field",
)
p.write_text(t)

p = Path("src/routes/traning.tsx")
t = p.read_text()
t = replace_once(
    t,
    'baseVisibleTests.map((test) => ({ ...test, id: test.to, skill: CATEGORY_ENGINE_SKILL[category] }))',
    'baseVisibleTests.map((test) => ({ ...test, id: test.to, engineSkill: CATEGORY_ENGINE_SKILL[category] }))',
    "training engine skill mapping",
)
p.write_text(t)
