from pathlib import Path

p = Path("src/routes/match.tsx")
s = p.read_text()


def rep(old: str, new: str, count: int = 1):
    global s
    if old not in s:
        raise SystemExit("Target not found:\n" + old[:300])
    s = s.replace(old, new, count)


# 1. Requested category order and Driver label.
rep(
'''const CATEGORIES = [
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Spela en riktig puttingmatch hål för hål. Färre puttar vinner hålet." },
  { id: "speed", title: "Speed", subtitle: "Ball speed", description: "Match Play i speed. Högsta ball speed vinner varje omgång." },
  { id: "around-the-green", title: "Chippning", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },
  { id: "bunker", title: "Bunker", subtitle: "Bunkerslag", description: "Samma bunkerläge för båda. Närmast hålet vinner." },
  { id: "approach", title: "Inspel", subtitle: "Järn & wedge · närmast flaggan", description: "Slå mot samma mål från varierade avstånd. Närmast flaggan vinner." },
  { id: "off-the-tee", title: "Utslag", subtitle: "Driver · fairway", description: "Längsta godkända drive inom en 30 meter bred fairway vinner." },
] as const;''',
'''const CATEGORIES = [
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Spela en riktig puttingmatch hål för hål. Färre puttar vinner hålet." },
  { id: "around-the-green", title: "Chippning", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },
  { id: "bunker", title: "Bunker", subtitle: "Bunkerslag", description: "Samma bunkerläge för båda. Närmast hålet vinner." },
  { id: "approach", title: "Inspel", subtitle: "Järn & wedge · närmast flaggan", description: "Slå mot samma mål från varierade avstånd. Närmast flaggan vinner." },
  { id: "off-the-tee", title: "Driver", subtitle: "Driver · fairway", description: "Längsta godkända drive inom en 30 meter bred fairway vinner." },
  { id: "speed", title: "Speed", subtitle: "Ball speed", description: "Match Play i speed. Högsta ball speed vinner varje omgång." },
] as const;''')

# 2. Shared adaptive Speed state.
rep(
'''  const [blueSpeed, setBlueSpeed] = useState(0);
  const [redSpeed, setRedSpeed] = useState(0);''',
'''  const [blueSpeed, setBlueSpeed] = useState(0);
  const [redSpeed, setRedSpeed] = useState(0);
  const [blueSpeedSelected, setBlueSpeedSelected] = useState(false);
  const [redSpeedSelected, setRedSpeedSelected] = useState(false);
  const [speedBaseline, setSpeedBaseline] = useState(0);''')

# Cloud restore: both players receive the same baseline.
rep(
'''        setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
        setApproachTurn("blue");''',
'''        setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
        if (state.category === "speed") {
          const cloudHoles = state.holes as Hole[];
          const previous = [...cloudHoles].slice(0, state.holeIndex).reverse().find((hole) => typeof hole.blueSpeed === "number" && typeof hole.redSpeed === "number");
          const baseline = previous ? Math.round(((previous.blueSpeed ?? 0) + (previous.redSpeed ?? 0)) / 2) : state.matchType === "driver" ? 140 : 110;
          setSpeedBaseline(baseline);
          setBlueSpeed(baseline); setRedSpeed(baseline);
          setBlueSpeedSelected(false); setRedSpeedSelected(false);
        }
        setApproachTurn("blue");''')

# Local restore.
rep(
'''      setBluePoints(saved.bluePoints ?? null);
      setRedPoints(saved.redPoints ?? null);''',
'''      setBluePoints(saved.bluePoints ?? null);
      setRedPoints(saved.redPoints ?? null);
      const restoredSpeedBaseline = saved.speedBaseline ?? (saved.matchType === "driver" ? 140 : 110);
      setSpeedBaseline(restoredSpeedBaseline);
      setBlueSpeed(saved.blueSpeed ?? restoredSpeedBaseline);
      setRedSpeed(saved.redSpeed ?? restoredSpeedBaseline);
      setBlueSpeedSelected(Boolean(saved.blueSpeedSelected));
      setRedSpeedSelected(Boolean(saved.redSpeedSelected));''')

# Edit-latest only for flows that actually support editing.
rep('const isScoredHole = isPutting || isShortGameScoring || isSpeed;', 'const isScoredHole = isPutting || isShortGameScoring;')

# Speed round wording in live status.
rep(
'''  const topScoreMeta = scoringMode === "match"
    ? `Hål ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`''',
'''  const topScoreMeta = scoringMode === "match"
    ? `${isSpeed ? "Omgång" : "Hål"} ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`''')

# Persist Speed input/baseline state locally.
rep(
'''      suddenDeathRound, sdMessage, blueStrokes, redStrokes, blueStrokesSelected, redStrokesSelected, bluePoints, redPoints,
      shortGameLies,''',
'''      suddenDeathRound, sdMessage, blueStrokes, redStrokes, blueStrokesSelected, redStrokesSelected, bluePoints, redPoints,
      blueSpeed, redSpeed, blueSpeedSelected, redSpeedSelected, speedBaseline,
      shortGameLies,''')
rep(
'''blueStrokesSelected, redStrokesSelected, bluePoints, redPoints, shortGameLies,''',
'''blueStrokesSelected, redStrokesSelected, bluePoints, redPoints, blueSpeed, redSpeed, blueSpeedSelected, redSpeedSelected, speedBaseline, shortGameLies,''')

# Club-specific first-round baseline.
rep(
'''    recordedHistoryIdRef.current = null;
    const nextHoles = isPgaPutting''',
'''    recordedHistoryIdRef.current = null;
    const initialSpeedBaseline = matchType === "driver" ? 140 : 110;
    const nextHoles = isPgaPutting''')
rep(
'''setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setBlueSpeed(0); setRedSpeed(0); setApproachTurn("blue");''',
'''setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setSpeedBaseline(initialSpeedBaseline); setBlueSpeed(initialSpeedBaseline); setRedSpeed(initialSpeedBaseline); setBlueSpeedSelected(false); setRedSpeedSelected(false); setApproachTurn("blue");''')

# +/- controls and adaptive baseline for each next round.
rep(
'''    setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setBlueSpeed(0); setRedSpeed(0);
  }
  function recordSpeed() {
    if (isSubmitting || blueSpeed <= 0 || redSpeed <= 0) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = blueSpeed > redSpeed ? "blue" : redSpeed > blueSpeed ? "red" : "tie";
    setTransitionMessage(`Omgång ${registered + 1} registrerad`);
    const next = holes.map((h, i) => i === registered ? { ...h, winner, blueSpeed, redSpeed } : h);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);
  }''',
'''    setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
  }
  function adjustSpeed(tone: "blue" | "red", delta: number) {
    const setter = tone === "blue" ? setBlueSpeed : setRedSpeed;
    setter((value) => Math.max(50, Math.min(220, value + delta)));
    if (tone === "blue") setBlueSpeedSelected(true);
    else setRedSpeedSelected(true);
  }
  function recordSpeed() {
    if (isSubmitting || !blueSpeedSelected || !redSpeedSelected || blueSpeed <= 0 || redSpeed <= 0) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = blueSpeed > redSpeed ? "blue" : redSpeed > blueSpeed ? "red" : "tie";
    const nextBaseline = Math.round((blueSpeed + redSpeed) / 2);
    setTransitionMessage(`Omgång ${registered + 1} registrerad`);
    const next = holes.map((h, i) => i === registered ? { ...h, winner, blueSpeed, redSpeed } : h);
    window.setTimeout(() => {
      advance(next);
      if (registered < matchLength - 1) {
        setSpeedBaseline(nextBaseline);
        setBlueSpeed(nextBaseline); setRedSpeed(nextBaseline);
        setBlueSpeedSelected(false); setRedSpeedSelected(false);
      }
      setTransitionMessage(null); setIsSubmitting(false);
    }, matchPacing.transitionMs);
  }''')

# Speed UI: stacked player cards with only -5/-1/+1/+5 controls.
old_speed_ui = '''<button disabled={isSubmitting} onClick={recordApproach} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 font-display text-xl text-white disabled:opacity-30">Spara slag <ChevronRight className="h-5 w-5" /></button></section> : isSpeed ? <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Ball speed</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Högsta speed vinner omgången · mph</p></div><div className="mt-4 grid grid-cols-2 gap-3">{([[blueLabel, blueSpeed, setBlueSpeed, "blue"], [redLabel, redSpeed, setRedSpeed, "red"]] as const).map(([label, value, setter, tone]) => <label key={tone} className={`rounded-[24px] border p-4 text-center ${tone === "blue" ? blueGlass : redGlass}`}><span className={`block truncate font-display text-xl ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</span><span className="mt-3 flex items-baseline justify-center gap-1"><input type="number" inputMode="decimal" min={1} max={250} step={0.1} value={value || ""} onChange={(e) => setter(Math.max(0, Math.min(250, Number(e.target.value))))} placeholder="0" className="w-24 bg-transparent text-center font-display text-4xl leading-none text-slate-950 outline-none" /><span className="text-xs font-bold uppercase text-slate-500">mph</span></span></label>)}</div><button disabled={isSubmitting || blueSpeed <= 0 || redSpeed <= 0} onClick={recordSpeed} className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 font-display text-xl text-white disabled:opacity-30 ${tight ? "mt-1 py-2.5" : compact ? "mt-2 py-3" : "mt-4 py-4"}`}>{isSubmitting ? "Registrerar…" : `Registrera omgång ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}>'''
new_speed_ui = '''<button disabled={isSubmitting} onClick={recordApproach} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 font-display text-xl text-white disabled:opacity-30">Spara slag <ChevronRight className="h-5 w-5" /></button></section> : isSpeed ? <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Ball speed</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Gemensam utgångspunkt {speedBaseline} mph · justera till exakt värde</p></div><div className={`space-y-3 ${compact ? "mt-3" : "mt-4"}`}>{([[blueLabel, blueSpeed, "blue"], [redLabel, redSpeed, "red"]] as const).map(([label, value, tone]) => { const selected = tone === "blue" ? blueSpeedSelected : redSpeedSelected; return <div key={tone} className={`rounded-[26px] border-2 ${compact ? "p-3" : "p-4"} ${tone === "blue" ? "border-blue-300 bg-blue-50/75" : "border-red-300 bg-red-50/75"}`}><div className="flex items-center justify-between gap-3"><p className={`min-w-0 truncate font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`shrink-0 font-display text-3xl leading-none transition-colors ${selected ? tone === "blue" ? "text-blue-700" : "text-red-700" : "text-slate-400"}`}>{value}<span className="ml-1 text-xs font-bold uppercase">mph</span></p></div><div className="mt-3 grid grid-cols-4 gap-2">{([-5, -1, 1, 5] as const).map((delta) => <button key={delta} type="button" disabled={isSubmitting} onClick={() => adjustSpeed(tone, delta)} className={`rounded-xl border py-2.5 text-sm font-bold shadow-sm transition active:scale-[.97] ${tone === "blue" ? "border-blue-200 bg-white text-blue-700" : "border-red-200 bg-white text-red-700"}`}>{delta > 0 ? `+${delta}` : delta}</button>)}</div></div>; })}</div><button disabled={isSubmitting || !blueSpeedSelected || !redSpeedSelected} onClick={recordSpeed} className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 font-display text-xl text-white disabled:opacity-30 ${tight ? "mt-1 py-2.5" : compact ? "mt-2 py-3" : "mt-4 py-4"}`}>{isSubmitting ? "Registrerar…" : `Registrera omgång ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}>'''
rep(old_speed_ui, new_speed_ui)

# Remove three-circle Target icon from Speed and from future categories by default.
rep(
'''>{!isPutting && !isShortGameScoring && !isApproach ? <Target className="mx-auto h-6 w-6 text-blue-600" /> : null}<h1''',
'''>{category === "off-the-tee" ? <Target className="mx-auto h-6 w-6 text-blue-600" /> : null}<h1''')

# Speed result wording.
s = s.replace(
    '{scoringMode === "match" ? "vunna hål" : isShortGameScoring ? "poäng" : "slag"}',
    '{scoringMode === "match" ? (isSpeed ? "vunna omg." : "vunna hål") : isShortGameScoring ? "poäng" : "slag"}',
)
s = s.replace(
    '{blueLabel} vann {score.blue} hål · {redLabel} vann {score.red} hål',
    '{blueLabel} vann {score.blue} {isSpeed ? "omgångar" : "hål"} · {redLabel} vann {score.red} {isSpeed ? "omgångar" : "hål"}',
)

p.write_text(s)
print("Speed Match refinement applied")
