from pathlib import Path

# Keep friend/team sudden-death state synchronized in multiplayer sessions.
p = Path('src/routes/match.tsx')
t = p.read_text()

old = '''      finalText: nextFinalText,
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),'''
new = '''      finalText: nextFinalText,
      step: step === "sudden-death" ? "sudden-death" : step === "result" ? "result" : "play",
      suddenDeathRound,
      sdBlue,
      sdRed,
      sdBlueSunk,
      sdRedSunk,
      sdMessage,
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),'''
if old in t:
    t = t.replace(old, new, 1)

old = '''        setFinalText(state.finalText ?? "");
        setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
        setApproachTurn("blue");
        setStep(session.status === "completed" || Boolean(state.finalText) ? "result" : "play");'''
new = '''        setFinalText(state.finalText ?? "");
        setSuddenDeathRound(state.suddenDeathRound ?? 1);
        setSdBlue(state.sdBlue ?? null); setSdRed(state.sdRed ?? null);
        setSdBlueSunk(Boolean(state.sdBlueSunk)); setSdRedSunk(Boolean(state.sdRedSunk)); setSdMessage(state.sdMessage ?? "");
        setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
        setApproachTurn("blue");
        setStep(session.status === "completed" || state.step === "result" || Boolean(state.finalText) ? "result" : state.step === "sudden-death" ? "sudden-death" : "play");'''
if old in t:
    t = t.replace(old, new, 1)

t = t.replace('if (!matchSessionId || !user || matchSessionHostId !== user.id || (step !== "play" && step !== "result")) return;', 'if (!matchSessionId || !user || matchSessionHostId !== user.id || (step !== "play" && step !== "sudden-death" && step !== "result")) return;')

t = t.replace('}, [matchSessionId, matchSessionHostId, user?.id, step, holes, holeIndex, finalText, mode, category, matchType, scoringMode, matchLength, blueLabel, redLabel, score.played]);', '}, [matchSessionId, matchSessionHostId, user?.id, step, holes, holeIndex, finalText, suddenDeathRound, sdBlue, sdRed, sdBlueSunk, sdRedSunk, sdMessage, mode, category, matchType, scoringMode, matchLength, blueLabel, redLabel, score.played]);', 1)

p.write_text(t)

# Make bot result screen explicitly reflect sudden-death winner.
p = Path('src/routes/match-bot.tsx')
t = p.read_text()
state_marker = '  const [sdBusy, setSdBusy] = useState(false);\n'
if 'suddenDeathWinner' not in t:
    t = t.replace(state_marker, state_marker + '  const [suddenDeathWinner, setSuddenDeathWinner] = useState<"you" | "bot" | null>(null);\n', 1)

t = t.replace('setSuddenDeathRound(1); setSdBotText(""); setSdBusy(false);', 'setSuddenDeathRound(1); setSdBotText(""); setSdBusy(false); setSuddenDeathWinner(null);', 1)

old = '''    setBotComment(youWin ? randomLine(bot.chat["player-win"]) : randomLine(bot.chat["bot-win"]));
    setStep("result"); setSdBusy(false);'''
new = '''    setBotComment(youWin ? randomLine(bot.chat["player-win"]) : randomLine(bot.chat["bot-win"]));
    setSuddenDeathWinner(youWin ? "you" : "bot");
    setStep("result"); setSdBusy(false);'''
if old in t:
    t = t.replace(old, new, 1)

old = '''<h1 className="mt-2 font-display text-5xl">{score.you}–{score.bot}</h1><p className="mt-2 text-sm font-bold">{score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p>'''
new = '''<h1 className="mt-2 font-display text-5xl">{suddenDeathWinner ? "SD" : `${score.you}–${score.bot}`}</h1><p className="mt-2 text-sm font-bold">{suddenDeathWinner === "you" ? `${playerName} vinner i sudden death` : suddenDeathWinner === "bot" ? `${bot.name} vinner i sudden death` : score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p>{suddenDeathWinner ? <p className="mt-1 text-xs font-semibold text-red-600">11 m · 1 slag · närmast flaggan</p> : null}'''
if old not in t:
    raise SystemExit('bot result text marker missing')
t = t.replace(old, new, 1)

p.write_text(t)
