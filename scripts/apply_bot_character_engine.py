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
'import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\nimport { BOT_PERSONALITIES, getBotRelationship, personalityLine, recordBotMatch, relationshipLine } from "@/lib/bot-personality";\n',
'personality import',
)

# Add George after Sarah.
marker = '  { id: "sarah", name: "Sarah", hcp: 27, gender: "Kvinna", role: "Weekend golfer", tier: "Nybörjare", avatar: "👩🏼", intro: "Helggolfare. Stabil när jag hittar rytmen.", categoryHcp: { putting: 30, chipping: 27, approach: 29, driving: 25 }, archetype: { label: "Helggolfaren", playStyle: "balanced", temperament: "streaky", communication: "social", aggression: 0.48, consistency: 0.42, clutch: 0.40, traits: ["Rytmspelare"] }, chat: genericChat },\n'
george = marker + '  { id: "george", name: "George", hcp: 24, gender: "Man", role: "Klubbveteran", tier: "Klubbspelare", avatar: "👴🏻", intro: "Har spelat här längre än du. Har också en åsikt om hur du gör det.", categoryHcp: { putting: 20, chipping: 19, approach: 26, driving: 31 }, archetype: { label: "Old-school grinder", playStyle: "conservative", temperament: "competitive", communication: "terse", aggression: 0.22, consistency: 0.62, clutch: 0.58, traits: ["Kortspel & åsikter"] }, chat: genericChat },\n'
rep(marker, george, 'add George')

# Start comment should come from personality when possible.
rep(
'  const [botComment, setBotComment] = useState(() => randomLine((selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]).chat.start));\n',
'  const [botComment, setBotComment] = useState(() => { const initial = selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]; return personalityLine(initial.id, "start") ?? randomLine(initial.chat.start); });\n',
'initial comment',
)

rep(
'    setBotComment(randomLine(item.chat.start));\n',
'    setBotComment(personalityLine(item.id, "start") ?? randomLine(item.chat.start));\n',
'choose comment',
)
rep(
'    setBotComment(randomLine(bot.chat.start));\n',
'    setBotComment(personalityLine(bot.id, "start") ?? randomLine(bot.chat.start));\n',
'build holes comment',
)

# Replace post-hole chat with character engine + bad-shot context.
old = '    const isPressure = Boolean(pressureNotice);\n    const event: BotEvent = isPressure ? "pressure" : winner === "bot" ? "bot-win" : winner === "you" ? "player-win" : "tie";\n    setBotComment(randomLine(bot.chat[event]));\n'
new = '''    const isPressure = Boolean(pressureNotice);\n    const event: BotEvent = isPressure ? "pressure" : winner === "bot" ? "bot-win" : winner === "you" ? "player-win" : "tie";\n    const playerBad = (category === "putting" && lockedYourValue >= 3) || (category === "around-the-green" && lockedYourValue <= 1) || (category === "off-the-tee" && !lockedDriveHit);\n    const botBad = (category === "putting" && simulated.value >= 3) || (category === "around-the-green" && simulated.value <= 1) || (category === "off-the-tee" && !simulated.hit);\n    const personalityEvent = isPressure ? "pressure" : playerBad ? "player-bad" : botBad ? "bot-bad" : event;\n    setBotComment(personalityLine(bot.id, personalityEvent) ?? randomLine(bot.chat[event]));\n'''
rep(old, new, 'dynamic comments')

# Record rivalry at normal match completion.
old = '      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }\n      else { setWinnerCelebration(finalYou > finalBot ? "you" : "bot"); await sleep(2300); setWinnerCelebration(null); setStep("result"); }\n'
new = '      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }\n      else { const matchWinner = finalYou > finalBot ? "you" : "bot"; recordBotMatch(bot.id, matchWinner === "you" ? "player" : "bot"); setWinnerCelebration(matchWinner); await sleep(2300); setWinnerCelebration(null); setStep("result"); }\n'
rep(old, new, 'record normal result')

# Record sudden death rivalry.
old = '    setSuddenDeathWinner(youWin ? "you" : "bot");\n    setWinnerCelebration(youWin ? "you" : "bot");\n'
new = '    setSuddenDeathWinner(youWin ? "you" : "bot");\n    recordBotMatch(bot.id, youWin ? "player" : "bot");\n    setWinnerCelebration(youWin ? "you" : "bot");\n'
rep(old, new, 'record sudden death')

# Bot cards: show social identity prominently and golf archetype secondarily.
old = '<span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{item.archetype.label}</span>\n'
new = '<span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[item.id]?.label ?? item.archetype.label}</span><span className="mt-1 block text-[10px] text-slate-500">{BOT_PERSONALITIES[item.id]?.oneLiner}</span>\n'
rep(old, new, 'card personality')

# Selected profile card gets social identity + rivalry memory.
old = '<p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{bot.archetype.label}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p><div className="mt-3 flex flex-wrap gap-1.5">{archetypeLabels(bot.archetype).map((trait) => <span key={trait} className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div>'
new = '<p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{BOT_PERSONALITIES[bot.id]?.oneLiner}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p>{relationshipLine(bot.id, bot.name) ? <p className="mt-2 text-[11px] font-semibold text-slate-500">{relationshipLine(bot.id, bot.name)}</p> : null}<div className="mt-3 flex flex-wrap gap-1.5">{archetypeLabels(bot.archetype).map((trait) => <span key={trait} className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div>'
rep(old, new, 'selected personality')

p.write_text(t)
