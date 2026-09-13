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
'import { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen, recordRecommendationSignal } from "@/lib/sg4-recommender";\n',
'recommender import',
)
rep(
'import { getBotResultReaction } from "@/lib/bot-result-reactions";\n',
'import { chooseBotNextStep } from "@/lib/bot-next-step";\nimport { recordBotCategoryMatch } from "@/lib/bot-match-history";\nimport { getSmartBotResultReaction } from "@/lib/bot-smart-result";\n',
'next-step imports',
)

old = '''  const resultOutcome: "player" | "bot" = suddenDeathWinner === "you" ? "player" : suddenDeathWinner === "bot" ? "bot" : score.you > score.bot ? "player" : "bot";\n  const resultReaction = getBotResultReaction(bot.id, resultOutcome);\n  const resultChallengeBot = resultReaction.targetBotId ? BOTS.find((item) => item.id === resultReaction.targetBotId) : undefined;\n'''
new = '''  const resultOutcome: "player" | "bot" = suddenDeathWinner === "you" ? "player" : suddenDeathWinner === "bot" ? "bot" : score.you > score.bot ? "player" : "bot";\n  const resultMargin = suddenDeathWinner ? 1 : Math.max(1, Math.abs(score.you - score.bot));\n  const resultNextStep = category ? chooseBotNextStep({\n    currentBotId: bot.id,\n    currentBotHcp: bot.hcp,\n    category,\n    outcome: resultOutcome,\n    margin: resultMargin,\n    candidates: BOTS.map((item) => ({ id: item.id, hcp: item.hcp, locked: item.locked })),\n  }) : { action: "rematch" as const, rematchScore: 1, challengeScore: 0 };\n  const resultChallengeBot = resultNextStep.targetBotId ? BOTS.find((item) => item.id === resultNextStep.targetBotId) : undefined;\n  const resultReactionLine = category ? getSmartBotResultReaction({\n    botId: bot.id,\n    botName: bot.name,\n    outcome: resultOutcome,\n    category,\n    nextStep: resultNextStep,\n    targetBotName: resultChallengeBot?.name,\n  }) : (resultOutcome === "player" ? "Bra spelat. En till?" : "Bra match. Revansch?");\n'''
rep(old, new, 'result decision block')

old = '''      else { const matchWinner = finalYou > finalBot ? "you" : "bot"; recordBotMatch(bot.id, matchWinner === "you" ? "player" : "bot"); setWinnerCelebration(matchWinner); await sleep(2300); setWinnerCelebration(null); setStep("result"); }\n'''
new = '''      else { const matchWinner = finalYou > finalBot ? "you" : "bot"; recordBotMatch(bot.id, matchWinner === "you" ? "player" : "bot"); if (category) recordBotCategoryMatch(bot.id, category, matchWinner === "you" ? "player" : "bot", Math.abs(finalYou - finalBot)); setWinnerCelebration(matchWinner); await sleep(2300); setWinnerCelebration(null); setStep("result"); }\n'''
rep(old, new, 'normal history record')

old = '''    recordBotMatch(bot.id, youWin ? "player" : "bot");\n    setWinnerCelebration(youWin ? "you" : "bot");\n'''
new = '''    recordBotMatch(bot.id, youWin ? "player" : "bot");\n    if (category) recordBotCategoryMatch(bot.id, category, youWin ? "player" : "bot", 1);\n    setWinnerCelebration(youWin ? "you" : "bot");\n'''
rep(old, new, 'sudden death history record')

rep('“{resultReaction.line}”', '“{resultReactionLine}”', 'reaction text')

old = '''              {resultReaction.action === "challenge" && resultChallengeBot && !resultChallengeBot.locked ? (\n                <button onClick={() => { chooseBot(resultChallengeBot); setStep("category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm">{resultReaction.actionLabel} <ChevronRight className="h-4 w-4" /></button>\n              ) : (\n                <button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm"><RotateCcw className="h-4 w-4" /> {resultReaction.actionLabel}</button>\n              )}\n'''
new = '''              {resultNextStep.action === "challenge" && resultChallengeBot && !resultChallengeBot.locked ? (\n                <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:challenge:${resultChallengeBot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); chooseBot(resultChallengeBot); setStep(category === "around-the-green" ? "setup" : category ? "length" : "category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm">Utmana {resultChallengeBot.name} <ChevronRight className="h-4 w-4" /></button>\n              ) : (\n                <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:rematch:${bot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm"><RotateCcw className="h-4 w-4" /> Rematch mot {bot.name}</button>\n              )}\n'''
rep(old, new, 'primary next action')

old = '''          <div className="mt-5 space-y-3">{resultReaction.action === "challenge" ? <button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button> : null}<button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div>\n'''
new = '''          <div className="mt-5 space-y-3">\n            {resultNextStep.action === "challenge" ? (\n              <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:rematch:${bot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button>\n            ) : resultChallengeBot && !resultChallengeBot.locked ? (\n              <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:challenge:${resultChallengeBot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); chooseBot(resultChallengeBot); setStep(category === "around-the-green" ? "setup" : category ? "length" : "category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><Target className="h-5 w-5" /> Utmana {resultChallengeBot.name}</button>\n            ) : null}\n            <button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button>\n            <Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link>\n          </div>\n'''
rep(old, new, 'alternate actions')

p.write_text(t)
