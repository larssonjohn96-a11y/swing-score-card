from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f'{label}: block not found')
    t = t.replace(old, new, 1)

rep(
'import { simulateChipBotResult, simulateDriveBotResult, simulatePuttingBotStrokes, type BotCategoryHandicaps } from "@/lib/bot-skill-model";\n',
'import { simulateChipBotResult, simulateDriveBotResult, simulatePuttingBotStrokes, type BotCategoryHandicaps } from "@/lib/bot-skill-model";\nimport { archetypeLabels, effectiveCategoryHcp, type BotArchetype } from "@/lib/bot-archetypes";\nimport { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\n',
'imports',
)
rep('  categoryHcp: BotCategoryHandicaps;\n', '  categoryHcp: BotCategoryHandicaps;\n  archetype: BotArchetype;\n', 'profile archetype')

archetypes = {
'margaret': '{ label: "Klubbveteranen", playStyle: "conservative", temperament: "calm", communication: "warm", aggression: 0.20, consistency: 0.58, clutch: 0.66, traits: ["Kortspelsräv"] }',
'leo': '{ label: "Nybörjaren", playStyle: "balanced", temperament: "streaky", communication: "social", aggression: 0.42, consistency: 0.25, clutch: 0.32, traits: ["Kan blixtra till"] }',
'sarah': '{ label: "Helggolfaren", playStyle: "balanced", temperament: "streaky", communication: "social", aggression: 0.48, consistency: 0.42, clutch: 0.40, traits: ["Rytmspelare"] }',
'zach': '{ label: "Bombaren", playStyle: "aggressive", temperament: "competitive", communication: "cocky", aggression: 0.88, consistency: 0.34, clutch: 0.47, traits: ["Lång från tee"] }',
'anna': '{ label: "Klubbmaskinen", playStyle: "conservative", temperament: "calm", communication: "focused", aggression: 0.30, consistency: 0.74, clutch: 0.62, traits: ["Ger bort få hål"] }',
'marcus': '{ label: "Pin huntern", playStyle: "aggressive", temperament: "competitive", communication: "cocky", aggression: 0.82, consistency: 0.57, clutch: 0.61, traits: ["Går för flaggan"] }',
'emma': '{ label: "Fairway-maskinen", playStyle: "conservative", temperament: "calm", communication: "focused", aggression: 0.28, consistency: 0.84, clutch: 0.72, traits: ["Stabil tee till green"] }',
'ryan': '{ label: "College grindern", playStyle: "aggressive", temperament: "competitive", communication: "focused", aggression: 0.72, consistency: 0.82, clutch: 0.84, traits: ["Pressar hela vägen"] }',
'maya': '{ label: "Scratch-taktikern", playStyle: "balanced", temperament: "ice-cold", communication: "terse", aggression: 0.55, consistency: 0.91, clutch: 0.91, traits: ["Nästan inga gratis slag"] }',
'noah': '{ label: "College-killern", playStyle: "aggressive", temperament: "ice-cold", communication: "terse", aggression: 0.78, consistency: 0.89, clutch: 0.93, traits: ["Attack under press"] }',
'sofia': '{ label: "Tour prospect", playStyle: "balanced", temperament: "ice-cold", communication: "focused", aggression: 0.60, consistency: 0.95, clutch: 0.96, traits: ["Små marginaler"] }',
'alex': '{ label: "Tour-proffset", playStyle: "balanced", temperament: "ice-cold", communication: "terse", aggression: 0.64, consistency: 0.97, clutch: 0.98, traits: ["Komplett spel"] }',
}
for bot_id, arch in archetypes.items():
    marker = f'id: "{bot_id}"'
    idx = t.index(marker)
    cat = t.index('categoryHcp:', idx)
    end = t.index('},', cat) + 2
    t = t[:end] + f', archetype: {arch}' + t[end:]

rep(
'function puttingBotStrokes(distance: number, bot: BotProfile) {\n  return simulatePuttingBotStrokes(distance, bot.categoryHcp.putting);\n}\n\nfunction drivingBotScore(bot: BotProfile) {\n  return simulateDriveBotResult(bot.categoryHcp.driving);\n}\n',
'function puttingBotStrokes(distance: number, bot: BotProfile, lateMatch = false) {\n  const hcp = effectiveCategoryHcp(bot.categoryHcp.putting, bot.archetype, lateMatch);\n  return simulatePuttingBotStrokes(distance, hcp, Math.random, bot.archetype);\n}\n\nfunction drivingBotScore(bot: BotProfile, lateMatch = false) {\n  const hcp = effectiveCategoryHcp(bot.categoryHcp.driving, bot.archetype, lateMatch);\n  return simulateDriveBotResult(hcp, Math.random, bot.archetype);\n}\n',
'sim helpers',
)

start = t.index('  const leadingName = matchDiff > 0 ? playerName : bot.name;')
end = t.index('  const resultLeader:', start)
replacement = '  const pressureNotice = getPlayerPressureNotice(matchDiff, holesRemaining, bot.name);\n'
t = t[:start] + replacement + t[end:]

rep(
'  function simulateBot(hole: Hole) {\n',
'  function simulateBot(hole: Hole) {\n    const lateMatch = holesRemaining <= 2;\n',
'sim late match',
)
rep('if (category === "putting") return { value: puttingBotStrokes(hole.distance ?? 3, bot),', 'if (category === "putting") return { value: puttingBotStrokes(hole.distance ?? 3, bot, lateMatch),', 'putting archetype')
rep('const chip = simulateChipBotResult(hole.distance ?? 15, bot.categoryHcp.chipping);', 'const chipHcp = effectiveCategoryHcp(bot.categoryHcp.chipping, bot.archetype, lateMatch);\n      const chip = simulateChipBotResult(hole.distance ?? 15, chipHcp, Math.random, bot.archetype);', 'chip archetype')
rep('const approachResult = simulateApproachResult(bot.categoryHcp.approach, 0, hole.distance ?? 120);', 'const approachHcp = effectiveCategoryHcp(bot.categoryHcp.approach, bot.archetype, lateMatch);\n      const approachResult = simulateApproachResult(approachHcp, 0, hole.distance ?? 120);', 'approach clutch')
rep('const result = drivingBotScore(bot);', 'const result = drivingBotScore(bot, lateMatch);', 'drive archetype')
rep('    const isPressure = holeIndex >= holes.length - 3;\n', '    const isPressure = Boolean(pressureNotice);\n', 'pressure event')

rep(
'<span className="mt-1 block text-[11px] text-slate-500">{item.gender} · {item.role}</span>\n',
'<span className="mt-1 block text-[11px] text-slate-500">{item.gender} · {item.role}</span>\n                        <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{item.archetype.label}</span>\n',
'bot card archetype',
)
rep(
'<p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p></div></div></section>',
'<p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{bot.archetype.label}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p><div className="mt-3 flex flex-wrap gap-1.5">{archetypeLabels(bot.archetype).map((trait) => <span key={trait} className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div></div></div></section>',
'selected archetype detail',
)

p.write_text(t)
