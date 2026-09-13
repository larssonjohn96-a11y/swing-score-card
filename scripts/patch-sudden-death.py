from pathlib import Path

# Friend/team match
p = Path('src/routes/match.tsx')
t = p.read_text()
t = t.replace('type Step = "players" | "teams" | "scoring" | "category" | "type" | "setup" | "approach-setup" | "length" | "play" | "result";', 'type Step = "players" | "teams" | "scoring" | "category" | "type" | "setup" | "approach-setup" | "length" | "play" | "sudden-death" | "result";')
t = t.replace('type MatchLength = 5 | 9 | 18;', 'type MatchLength = 3 | 5 | 7;')
t = t.replace('function bunkerLimit(length: MatchLength) { return length === 5 ? 1 : length === 9 ? 2 : 4; }', 'function bunkerLimit(length: MatchLength) { return length === 3 ? 1 : length === 5 ? 1 : 2; }')
t = t.replace('setMatchLength(9);', 'setMatchLength(5);')

state_marker = '  const [finalText, setFinalText] = useState("");\n'
if state_marker not in t:
    raise SystemExit('friend state marker missing')
t = t.replace(state_marker, state_marker + '  const [suddenDeathRound, setSuddenDeathRound] = useState(1);\n  const [sdBlue, setSdBlue] = useState<number | null>(null);\n  const [sdRed, setSdRed] = useState<number | null>(null);\n  const [sdBlueSunk, setSdBlueSunk] = useState(false);\n  const [sdRedSunk, setSdRedSunk] = useState(false);\n  const [sdMessage, setSdMessage] = useState("");\n')

# Reset SD state at match start
old = 'setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setIsSubmitting(false);'
new = 'setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setIsSubmitting(false);'
if old not in t:
    raise SystemExit('friend start reset marker missing')
t = t.replace(old, new, 1)

# Match-play tie enters sudden death instead of result
old = '      if (d === 0) setFinalText("Matchen slutar delad · AS");\n      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);\n      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);\n      setStep("result"); return;'
new = '      if (d === 0) { setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }\n      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);\n      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);\n      setStep("result"); return;'
if old not in t:
    raise SystemExit('friend advance match marker missing')
t = t.replace(old, new, 1)

# Stroke ties also go sudden death
old = '        if (delta === 0) setFinalText(`Delat · ${s.bluePoints} poäng`);\n        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} poäng`);'
new = '        if (delta === 0) { setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }\n        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} poäng`);'
t = t.replace(old, new, 1)
old = '        if (delta === 0) setFinalText(`Delat · ${s.blueStrokes} slag`);\n        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} slag`);'
new = '        if (delta === 0) { setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }\n        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} slag`);'
t = t.replace(old, new, 1)

func_marker = '  function rematch() {\n'
if func_marker not in t:
    raise SystemExit('friend rematch marker missing')
sd_func = '''  function recordSuddenDeath() {\n    if ((!sdBlueSunk && sdBlue === null) || (!sdRedSunk && sdRed === null)) return;\n    const tied = (sdBlueSunk && sdRedSunk) || (!sdBlueSunk && !sdRedSunk && sdBlue === sdRed);\n    if (tied) {\n      setSdMessage("Lika igen · ny straff från 11 m");\n      window.setTimeout(() => { setSuddenDeathRound((r) => r + 1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); }, 850);\n      return;\n    }\n    const blueWins = sdBlueSunk || (!sdRedSunk && !sdBlueSunk && (sdBlue ?? Infinity) < (sdRed ?? Infinity));\n    setFinalText(`${blueWins ? blueLabel : redLabel} vinner i sudden death · 11 m`);\n    setStep("result");\n  }\n\n'''
t = t.replace(func_marker, sd_func + func_marker, 1)

# Header behavior and main padding
# Header stays hidden in sudden death like play/result
t = t.replace('{step !== "play" && step !== "result" ? <header', '{step !== "play" && step !== "sudden-death" && step !== "result" ? <header', 1)

# Insert sudden death UI immediately before result UI
result_marker = '    {step === "result" ? <>'
if result_marker not in t:
    raise SystemExit('friend result UI marker missing')
choices = '[0.5, 1, 1.5, 2, 3, 5, 8]'
sd_ui = f'''    {{step === "sudden-death" ? <>\n      <section className="pt-4 text-center"><p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Sudden death</p><h1 className="mt-2 font-display text-5xl">11 meter</h1><p className="mt-2 text-sm font-semibold text-slate-700">1 slag · närmast flaggan vinner allt</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Straff {{suddenDeathRound}}</p></section>\n      <div className="mt-6 grid grid-cols-2 gap-3">\n        <section className={{`rounded-[26px] border p-4 ${{blueGlass}}`}}><p className="text-center text-xs font-black text-blue-700">{{blueLabel}}</p><button onClick={{() => {{ setSdBlueSunk(true); setSdBlue(null); }}}} className={{`mt-3 w-full rounded-2xl border py-3 text-sm font-black ${{sdBlueSunk ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white/80 text-blue-700"}}`}}>Sänkt</button><div className="mt-2 grid grid-cols-2 gap-1.5">{{{choices}.map((v) => <button key={{v}} onClick={{() => {{ setSdBlueSunk(false); setSdBlue(v); }}}} className={{`rounded-xl border px-1 py-2 text-xs font-bold ${{!sdBlueSunk && sdBlue === v ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white/80"}}`}}>{{v}} m</button>)}}</div></section>\n        <section className={{`rounded-[26px] border p-4 ${{redGlass}}`}}><p className="text-center text-xs font-black text-red-700">{{redLabel}}</p><button onClick={{() => {{ setSdRedSunk(true); setSdRed(null); }}}} className={{`mt-3 w-full rounded-2xl border py-3 text-sm font-black ${{sdRedSunk ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-white/80 text-red-700"}}`}}>Sänkt</button><div className="mt-2 grid grid-cols-2 gap-1.5">{{{choices}.map((v) => <button key={{v}} onClick={{() => {{ setSdRedSunk(false); setSdRed(v); }}}} className={{`rounded-xl border px-1 py-2 text-xs font-bold ${{!sdRedSunk && sdRed === v ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white/80"}}`}}>{{v}} m</button>)}}</div></section>\n      </div>\n      {{sdMessage ? <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">{{sdMessage}}</div> : null}}\n      <button disabled={{(!sdBlueSunk && sdBlue === null) || (!sdRedSunk && sdRed === null)}} onClick={{recordSuddenDeath}} className="mt-5 w-full rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Avgör straffen</button>\n    </> : null}}\n\n'''
t = t.replace(result_marker, sd_ui + result_marker, 1)

p.write_text(t)

# Bot match
p = Path('src/routes/match-bot.tsx')
t = p.read_text()
t = t.replace('type Step = "bot" | "category" | "setup" | "length" | "play" | "result";', 'type Step = "bot" | "category" | "setup" | "length" | "play" | "sudden-death" | "result";')
t = t.replace('type MatchLength = 5 | 9 | 18;', 'type MatchLength = 3 | 5 | 7;')
t = t.replace('const [length, setLength] = useState<MatchLength>(9);', 'const [length, setLength] = useState<MatchLength>(5);')
t = t.replace('([5, 9, 18] as const)', '([3, 5, 7] as const)')

state_marker = '  const [approachSide, setApproachSide] = useState<ApproachSide>("right");\n'
if state_marker not in t:
    raise SystemExit('bot state marker missing')
t = t.replace(state_marker, state_marker + '  const [suddenDeathRound, setSuddenDeathRound] = useState(1);\n  const [sdBotText, setSdBotText] = useState("");\n  const [sdBusy, setSdBusy] = useState(false);\n')

# Reset SD state when starting
old = '    setTurnState("you");\n    setStep("play");'
new = '    setTurnState("you");\n    setSuddenDeathRound(1); setSdBotText(""); setSdBusy(false);\n    setStep("play");'
if old not in t:
    raise SystemExit('bot build reset marker missing')
t = t.replace(old, new, 1)

# Regular match completion: calculate score including last hole and enter SD when tied
old = '''    if (holeIndex >= holes.length - 1) {\n      resetShotInput();\n      setStep("result");\n    } else {'''
new = '''    if (holeIndex >= holes.length - 1) {\n      resetShotInput();\n      const finalYou = score.you + (winner === "you" ? 1 : 0);\n      const finalBot = score.bot + (winner === "bot" ? 1 : 0);\n      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }\n      else setStep("result");\n    } else {'''
if old not in t:
    raise SystemExit('bot finish marker missing')
t = t.replace(old, new, 1)

# Add bot sudden-death logic before back()
marker = '  function back() {\n'
if marker not in t:
    raise SystemExit('bot back marker missing')
func = '''  function simulateSuddenDeathBot() {\n    const skillHcp = bot.hcp - bot.putting;\n    const makeChance = clamp(0.22 - skillHcp * 0.0045, 0.035, 0.32);\n    if (Math.random() < makeChance) return { sunk: true, distance: 0 };\n    const spread = clamp(2.2 + skillHcp * 0.045, 0.8, 4.8);\n    return { sunk: false, distance: Math.max(0.2, Math.round((0.2 + Math.random() * spread) * 10) / 10) };\n  }\n\n  async function playSuddenDeath(yourDistance: number | null) {\n    if (sdBusy) return;\n    const yourSunk = yourDistance === null;\n    setSdBusy(true); setSdBotText(`${bot.name} slår från 11 m…`);\n    await sleep(rand(2000, 3000));\n    const b = simulateSuddenDeathBot();\n    setSdBotText(b.sunk ? `${bot.name}: sänkt` : `${bot.name}: ${b.distance.toFixed(1)} m från flaggan`);\n    const tied = (yourSunk && b.sunk) || (!yourSunk && !b.sunk && yourDistance === b.distance);\n    if (tied) {\n      await sleep(1000);\n      setSdBotText("Lika igen · ny straff från 11 m");\n      await sleep(900);\n      setSuddenDeathRound((r) => r + 1); setSdBotText(""); setSdBusy(false);\n      return;\n    }\n    const youWin = yourSunk || (!b.sunk && !yourSunk && (yourDistance ?? Infinity) < b.distance);\n    await sleep(900);\n    setBotComment(youWin ? randomLine(bot.chat["player-win"]) : randomLine(bot.chat["bot-win"]));\n    setStep("result"); setSdBusy(false);\n  }\n\n'''
t = t.replace(marker, func + marker, 1)

# Hide standard header in SD
# Original checks step !== play && step !== result
t = t.replace('step !== "play" && step !== "result"', 'step !== "play" && step !== "sudden-death" && step !== "result"', 1)

result_marker = '      {step === "result" ? ('
if result_marker not in t:
    raise SystemExit('bot result UI marker missing')
sd_ui = '''      {step === "sudden-death" ? (\n        <>\n          <section className="pt-4 text-center"><p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Sudden death</p><h1 className="mt-2 font-display text-5xl">11 meter</h1><p className="mt-2 text-sm font-semibold text-slate-700">1 slag · närmast flaggan vinner allt</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Straff {suddenDeathRound}</p></section>\n          <section className={`mt-6 rounded-[28px] border p-5 ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Ditt resultat</p><p className="mt-1 text-sm text-slate-600">Tryck på avståndet bollen stannade från flaggan.</p><button disabled={sdBusy} onClick={() => void playSuddenDeath(null)} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white disabled:opacity-40">Sänkt</button><div className="mt-2 grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2, 3, 5, 8, 11].map((v) => <button disabled={sdBusy} key={v} onClick={() => void playSuddenDeath(v)} className="rounded-xl border border-slate-200 bg-white/90 py-3 text-xs font-bold disabled:opacity-40">{v} m</button>)}</div></section>\n          {sdBotText ? <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}\n          <div className="mt-4 flex items-start gap-2"><span className="text-3xl">{bot.avatar}</span><div className={`rounded-2xl border p-3 text-sm ${glass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div></div>\n        </>\n      ) : null}\n\n'''
t = t.replace(result_marker, sd_ui + result_marker, 1)

p.write_text(t)
