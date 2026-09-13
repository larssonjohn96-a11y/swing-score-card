from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f'{label}: block not found')
    t = t.replace(old, new, 1)

rep(
'import { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
'import { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\nimport { simulateChipBotResult, simulateDriveBotResult, simulatePuttingBotStrokes, type BotCategoryHandicaps } from "@/lib/bot-skill-model";\n',
'import bot model',
)
rep(
'  putting: number;\n  shortGame: number;\n  approach: number;\n  driving: number;\n',
'  categoryHcp: BotCategoryHandicaps;\n',
'profile skills',
)
rep('  botApproach?: ApproachResult;\n', '  botApproach?: ApproachResult;\n  botResultText?: string;\n', 'hole bot result text')

replacements = {
'intro: "Jag spelar lugnt, men underskatta inte mina korta puttar.", putting: 4, shortGame: 2, approach: -2, driving: -6,': 'intro: "Jag spelar lugnt, men underskatta inte mina korta puttar.", categoryHcp: { putting: 34, chipping: 39, approach: 48, driving: 52 },',
'intro: "Jag började nyligen. Några riktigt bra slag dyker upp ibland.", putting: -1, shortGame: -1, approach: 0, driving: 3,': 'intro: "Jag började nyligen. Några riktigt bra slag dyker upp ibland.", categoryHcp: { putting: 36, chipping: 38, approach: 34, driving: 29 },',
'intro: "Helggolfare. Stabil när jag hittar rytmen.", putting: 2, shortGame: 0, approach: 0, driving: 1,': 'intro: "Helggolfare. Stabil när jag hittar rytmen.", categoryHcp: { putting: 30, chipping: 27, approach: 29, driving: 25 },',
'intro: "Jag gillar att slå långt. Precisionen får vi se hur det går med.", putting: -2, shortGame: -1, approach: 0, driving: 5,': 'intro: "Jag gillar att slå långt. Precisionen får vi se hur det går med.", categoryHcp: { putting: 27, chipping: 25, approach: 22, driving: 15 },',
'intro: "Jag ger sällan bort ett hål. Du får vinna det.", putting: 2, shortGame: 2, approach: 1, driving: 0,': 'intro: "Jag ger sällan bort ett hål. Du får vinna det.", categoryHcp: { putting: 13, chipping: 14, approach: 17, driving: 20 },',
'intro: "Jag spelar aggressivt och går för flaggan.", putting: -1, shortGame: 1, approach: 3, driving: 3,': 'intro: "Jag spelar aggressivt och går för flaggan.", categoryHcp: { putting: 14, chipping: 10, approach: 8, driving: 8 },',
'intro: "Fairways, greener och tålamod. Jag gör inte många stora misstag.", putting: 2, shortGame: 2, approach: 2, driving: 1,': 'intro: "Fairways, greener och tålamod. Jag gör inte många stora misstag.", categoryHcp: { putting: 5, chipping: 6, approach: 7, driving: 10 },',
'intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", putting: 2, shortGame: 2, approach: 4, driving: 5,': 'intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", categoryHcp: { putting: 3, chipping: 4, approach: 1, driving: 0 },',
'intro: "Scratch. Jag räknar med att du träffar ditt bästa slag.", putting: 3, shortGame: 4, approach: 4, driving: 3,': 'intro: "Scratch. Jag räknar med att du träffar ditt bästa slag.", categoryHcp: { putting: 1, chipping: -1, approach: 0, driving: 1 },',
'intro: "Jag spelar för att vinna. Pars räcker inte alltid.", putting: 4, shortGame: 3, approach: 5, driving: 5,': 'intro: "Jag spelar för att vinna. Pars räcker inte alltid.", categoryHcp: { putting: -1, chipping: 0, approach: -3, driving: -4 },',
'intro: "Små marginaler. Ett svagt slag och jag tar hålet.", putting: 5, shortGame: 5, approach: 5, driving: 4,': 'intro: "Små marginaler. Ett svagt slag och jag tar hålet.", categoryHcp: { putting: -5, chipping: -5, approach: -4, driving: -2 },',
'intro: "Tour-nivå. Du behöver spela nära ditt tak för att slå mig.", putting: 5, shortGame: 5, approach: 6, driving: 6,': 'intro: "Tour-nivå. Du behöver spela nära ditt tak för att slå mig.", categoryHcp: { putting: -6, chipping: -7, approach: -7, driving: -8 },',
}
for old, new in replacements.items():
    if old not in t:
        raise SystemExit(f'bot profile not found: {old[:40]}')
    t = t.replace(old, new)

start = t.index('function puttingBotStrokes(')
end = t.index('\nfunction BotMatchPage()', start)
t = t[:start] + '''function puttingBotStrokes(distance: number, bot: BotProfile) {
  return simulatePuttingBotStrokes(distance, bot.categoryHcp.putting);
}

function drivingBotScore(bot: BotProfile) {
  return simulateDriveBotResult(bot.categoryHcp.driving);
}
''' + t[end:]

rep(
'    if (category === "around-the-green") return { value: shortGameBotPoints(bot), hit: true, approachResult: undefined };\n',
'    if (category === "around-the-green") {\n      const chip = simulateChipBotResult(hole.distance ?? 15, bot.categoryHcp.chipping);\n      return { value: chip.points, hit: true, approachResult: undefined, resultText: chip.description };\n    }\n',
'chipping simulation',
)
rep(
'      const approachResult = simulateApproachResult(bot.hcp, bot.approach, hole.distance ?? 120);\n      return { value: approachProximity(approachResult, hole.distance ?? 120), hit: true, approachResult };\n',
'      const approachResult = simulateApproachResult(bot.categoryHcp.approach, 0, hole.distance ?? 120);\n      return { value: approachProximity(approachResult, hole.distance ?? 120), hit: true, approachResult, resultText: undefined };\n',
'approach hcp',
)
rep(
'    return { value: result.carry, hit: result.hit, approachResult: undefined };\n',
'    return { value: result.carry, hit: result.hit, approachResult: undefined, resultText: result.strike === "top" ? `Toppad · ${result.carry} m` : result.strike === "wild" ? `Grov miss · ${result.carry} m` : undefined };\n',
'drive result text',
)
rep(
'? { ...h, botValue: simulated.value, botHit: simulated.hit, botApproach: simulated.approachResult, winner }\n',
'? { ...h, botValue: simulated.value, botHit: simulated.hit, botApproach: simulated.approachResult, botResultText: simulated.resultText, winner }\n',
'store bot result text',
)
rep(
'    if (category === "around-the-green") return typeof value === "number" ? CHIP_POINT_ZONES.find((zone) => zone.points === value)?.label ?? "–" : "–";\n',
'    if (category === "around-the-green") {\n      if (side === "bot" && hole.botResultText) return hole.botResultText;\n      return typeof value === "number" ? CHIP_POINT_ZONES.find((zone) => zone.points === value)?.label ?? "–" : "–";\n    }\n',
'chip result label',
)
rep('    const skillHcp = bot.hcp - bot.putting;\n', '    const skillHcp = bot.categoryHcp.putting;\n', 'sudden death putting hcp')

p.write_text(t)
