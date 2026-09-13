from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f'{label}: block not found')
    t = t.replace(old, new, 1)

rep(
'import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\n',
'import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\nimport { getBotResultReaction } from "@/lib/bot-result-reactions";\n',
'add result reaction import',
)

marker = '  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;\n'
insert = '''  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;\n  const resultOutcome: "player" | "bot" = suddenDeathWinner === "you" ? "player" : suddenDeathWinner === "bot" ? "bot" : score.you > score.bot ? "player" : "bot";\n  const resultReaction = getBotResultReaction(bot.id, resultOutcome);\n  const resultChallengeBot = resultReaction.targetBotId ? BOTS.find((item) => item.id === resultReaction.targetBotId) : undefined;\n'''
rep(marker, insert, 'result reaction state')

score_end = '''          </section>\n\n          <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela matchen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{playedHoles} spelade</p></div>'''
reaction = '''          </section>\n\n          <section className={`mt-4 overflow-hidden rounded-[26px] border ${redGlass}`}>
            <div className="flex items-start gap-3 p-4">
              <span className="text-4xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-xl text-slate-950">{bot.name}</p>
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-6 text-slate-800">“{resultReaction.line}”</p>
              </div>
            </div>
            <div className="border-t border-red-200/70 p-3">
              {resultReaction.action === "challenge" && resultChallengeBot && !resultChallengeBot.locked ? (
                <button onClick={() => { chooseBot(resultChallengeBot); setStep("category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm">{resultReaction.actionLabel} <ChevronRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm"><RotateCcw className="h-4 w-4" /> {resultReaction.actionLabel}</button>
              )}
            </div>
          </section>\n\n          <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela matchen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{playedHoles} spelade</p></div>'''
rep(score_end, reaction, 'insert reaction card')

old_actions = '''          <div className="mt-5 space-y-3"><button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button><button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div>'''
new_actions = '''          <div className="mt-5 space-y-3">{resultReaction.action === "challenge" ? <button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button> : null}<button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div>'''
rep(old_actions, new_actions, 'dedupe actions')

p.write_text(t)
