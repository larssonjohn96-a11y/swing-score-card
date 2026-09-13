from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f'{label}: block not found')
    t = t.replace(old, new, 1)

rep(
'import { getRecommendationsForSkill } from "@/lib/sg4-surface-recommendations";\n',
'import { getPlayRecommendations } from "@/lib/sg4-surface-recommendations";\n',
'play recommendation import',
)

rep(
'''  const resultEngineSkill = engineSkillForBotCategory(category);\n  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;\n''',
'''  const resultRecommendation = getPlayRecommendations(1, ["play-bot"])[0];\n''',
'play-only result recommendation',
)

p.write_text(t)
