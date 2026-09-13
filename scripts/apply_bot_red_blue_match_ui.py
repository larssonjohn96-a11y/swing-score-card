from pathlib import Path
import re

p = Path("src/routes/match-bot.tsx")
t = p.read_text()


def replace_once(old: str, new: str, label: str):
    global t
    if old not in t:
        raise SystemExit(f"{label}: expected block not found")
    t = t.replace(old, new, 1)


# Shared match state / colours. Bot is always Red, player is always Blue.
replace_once(
'''  const current = holes[holeIndex];
  const playerName = displayName ?? "Du";
  const resultEngineSkill = engineSkillForBotCategory(category);
  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;
  useEffect(() => {
    if (step !== "result") return;
    recordRecommendationCompletion("play-bot");
    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);
  }, [step, resultRecommendation?.id]);
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const selected = "border-emerald-500 bg-emerald-50/95 ring-2 ring-emerald-500/25";
''',
'''  const current = holes[holeIndex];
  const playerName = displayName ?? "Du";
  const selectedCategory = CATEGORIES.find((item) => item.id === category);
  const playedHoles = score.you + score.bot + score.tie;
  const matchDiff = score.you - score.bot;
  const holesRemaining = Math.max(0, length - playedHoles);
  const liveLeader: "blue" | "red" | null = matchDiff > 0 ? "blue" : matchDiff < 0 ? "red" : null;
  const topScoreText = matchDiff === 0 ? "AS" : `${Math.abs(matchDiff)} UP`;
  const leadingName = matchDiff > 0 ? playerName : bot.name;
  const trailingName = matchDiff > 0 ? bot.name : playerName;
  const pressureNotice = holesRemaining <= 0 ? null
    : matchDiff === 0 && holesRemaining === 1
      ? "Sista hålet avgör matchen."
      : Math.abs(matchDiff) === holesRemaining
        ? `${leadingName} kan avgöra matchen nu. ${trailingName} måste vinna hålet.`
        : Math.abs(matchDiff) === holesRemaining - 1 && Math.abs(matchDiff) > 0
          ? `${trailingName} måste vinna eller dela hålet för att hålla matchen vid liv.`
          : null;
  const resultLeader: "blue" | "red" | null = suddenDeathWinner === "you" ? "blue" : suddenDeathWinner === "bot" ? "red" : liveLeader;
  const resultEngineSkill = engineSkillForBotCategory(category);
  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;
  useEffect(() => {
    if (step !== "result") return;
    recordRecommendationCompletion("play-bot");
    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);
  }, [step, resultRecommendation?.id]);
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/60 bg-gradient-to-br from-blue-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const redGlass = "border-red-300/60 bg-gradient-to-br from-red-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const selected = "border-blue-500 bg-blue-50/95 ring-2 ring-blue-500/25";
''',
"match state",
)

# Generic result formatter used by reveal + scorecard.
pattern = re.compile(r'''  const resultLabel = \(hole: Hole\) => \{\n    if \(hole\.botValue == null \|\| !category\) return "";\n    if \(category === "around-the-green"\) return `\$\{hole\.botValue\} p`;\n    if \(category === "approach"\) return hole\.botApproach \? formatApproachResult\(hole\.botApproach\) : "";\n    if \(category === "putting"\) return `\$\{hole\.botValue\} puttar`;\n    return hole\.botHit \? `\$\{hole\.botValue\} m · fairway` : `\$\{hole\.botValue\} m · miss`;\n  \};''')
new_formatter = '''  const sideResultLabel = (hole: Hole, side: "you" | "bot") => {
    if (!category) return "–";
    const value = side === "you" ? hole.yourValue : hole.botValue;
    const hit = side === "you" ? hole.yourHit : hole.botHit;
    const approach = side === "you" ? hole.yourApproach : hole.botApproach;
    if (category === "around-the-green") return typeof value === "number" ? CHIP_POINT_ZONES.find((zone) => zone.points === value)?.label ?? "–" : "–";
    if (category === "approach") return approach ? formatApproachResult(approach) : "–";
    if (category === "putting") return typeof value === "number" ? `${value}` : "–";
    if (typeof value !== "number") return "–";
    return `${value}m${hit ? " ✓" : " ×"}`;
  };
  const resultLabel = (hole: Hole) => sideResultLabel(hole, "bot");'''
t, n = pattern.subn(new_formatter, t, count=1)
if n != 1:
    raise SystemExit("result formatter: expected block not found")

# Pre-match accents: use neutral/blue selection, blue-vs-red start CTA, Red identity for the bot.
replacements = [
    ('bg-emerald-600 text-white"><Check', 'bg-red-600 text-white"><Check'),
    ('text-xs font-bold text-emerald-700">HCP', 'text-xs font-bold text-red-700">HCP'),
    ('h-5 w-5 text-emerald-600" /> : null}</button>)}</div>', 'h-5 w-5 text-blue-600" /> : null}</button>)}</div>'),
    ('<Target className="h-5 w-5 text-emerald-600" />', '<Target className="h-5 w-5 text-red-600" />'),
    ('rounded-full bg-emerald-600 px-2 py-0.5', 'rounded-full bg-blue-600 px-2 py-0.5'),
    ('h-5 w-5 shrink-0 text-emerald-600" /> : null}', 'h-5 w-5 shrink-0 text-blue-600" /> : null}'),
    ('bg-gradient-to-r from-emerald-600 via-slate-950 to-emerald-700', 'bg-gradient-to-r from-blue-600 via-slate-950 to-red-600'),
]
for old, new in replacements:
    t = t.replace(old, new)

# Replace live match chrome with the exact same visual grammar as friend Match Play.
play_pattern = re.compile(
    r'''      \{step === "play" && current \? \(\n        <>\n.*?\n          <section className=\{approachPlay \? "mt-2" : "mt-3"\}>''',
    re.S,
)
play_ui = '''      {step === "play" && current ? (
        <>
          <header className="relative flex h-9 items-center justify-center"><Link to="/" aria-label="Till startsidan" className={`absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xl leading-none ${glass}`}>‹</Link><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Match Play · {selectedCategory?.title}</p><span className="absolute right-0 top-0 inline-flex h-9 items-center rounded-full border border-red-200 bg-red-50/90 px-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-red-700">Red · HCP {formatHcp(bot.hcp)}</span></header>
          <style>{`@keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}@keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.18}48%{opacity:.62}78%{opacity:.18}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}`}</style>
          <section className="mt-1">
            <div className="overflow-hidden rounded-[20px] border border-slate-300/80 bg-white/85 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)] backdrop-blur-2xl">
              <div className="grid min-h-[52px] grid-cols-[1fr_82px_1fr] items-stretch">
                <div style={liveLeader === "blue" ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined} className={`flex min-w-0 items-center px-3 pr-5 ${liveLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "blue" ? "text-white" : "text-slate-700"}`}>{playerName}</p><p className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${liveLeader === "blue" ? "text-blue-100" : "text-blue-600"}`}>{liveLeader === "blue" ? "leder" : "Blue"}</p></div></div>
                <div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Hål {Math.min(holeIndex + 1, length)} av {length}</p><p className={`mt-0.5 font-display text-[22px] leading-none ${liveLeader === "red" ? "text-red-600" : liveLeader === "blue" ? "text-blue-600" : "text-slate-950"}`}>{topScoreText}</p></div>
                <div style={liveLeader === "red" ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" } : undefined} className={`flex min-w-0 items-center justify-end px-3 pl-5 text-right ${liveLeader === "red" ? "bg-red-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "red" ? "text-white" : "text-slate-700"}`}>{bot.name}</p><p className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${liveLeader === "red" ? "text-red-100" : "text-red-600"}`}>{liveLeader === "red" ? "leder" : "Red"}</p></div></div>
              </div>
              <div className="flex items-center justify-center gap-[3px] border-t border-slate-200/80 px-2 py-1">{holes.map((h, i) => <span key={`live-${i}`} className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ${h.winner === "you" ? "bg-blue-600 text-white" : h.winner === "bot" ? "bg-red-600 text-white" : h.winner === "tie" ? "bg-slate-300 text-slate-700" : i === holeIndex ? "border border-slate-500 bg-white text-slate-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>)}</div>
            </div>
            {pressureNotice ? <div className="mt-2 overflow-hidden"><div key={`pressure-${holeIndex}-${pressureNotice}`} className="relative overflow-hidden rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.18s cubic-bezier(.2,.75,.25,1) 150ms both" }} /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det</p><p className="mt-1 text-xs font-bold leading-snug text-slate-800">{pressureNotice}</p></div></div></div> : null}
          </section>

          <div className="mt-2 flex items-start justify-end gap-2"><div className="relative max-w-[82%] rounded-2xl rounded-tr-md border border-red-200 bg-red-50/90 px-3 py-2 text-right shadow-sm"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-red-600">{bot.name} · Red</p><p className="mt-0.5 text-sm leading-snug text-slate-700">“{botComment}”</p></div><span className="text-3xl">{bot.avatar}</span></div>

          <section className={`${approachPlay ? "mt-2 rounded-[28px] p-3" : "mt-2 rounded-[32px] p-4"} border border-slate-300/90 bg-slate-100/90 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl`}><h1 className={`${category === "putting" ? "text-5xl" : approachPlay ? "text-4xl" : "text-5xl"} font-display leading-[1.05]`}>{current.title}</h1><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{selectedCategory?.sub}</p><p className="mt-1 text-xs text-slate-600">{current.detail}</p>{turnState === "you" && !approachPlay ? <div className={`mt-3 rounded-[20px] border p-3 text-left ${blueGlass}`}><p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Blue · Din tur</p><p className="mt-1 text-sm font-bold text-blue-950">Du spelar först</p></div> : null}{turnState === "bot-thinking" ? <div className={`mt-3 rounded-[20px] border p-3 ${redGlass}`}><div className="flex items-center justify-center gap-3"><span className="text-3xl">{bot.avatar}</span><div className="text-left"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-700">Red · {bot.name} spelar…</p><div className="mt-2 flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-red-600" /></div></div></div></div> : null}{turnState === "reveal" && current.botValue != null ? <div className={`mt-3 rounded-[20px] border p-3 ${current.winner === "you" ? blueGlass : current.winner === "bot" ? redGlass : glass}`}><p className={`text-[9px] font-black uppercase tracking-[0.14em] ${current.winner === "you" ? "text-blue-700" : current.winner === "bot" ? "text-red-700" : "text-slate-600"}`}>{bot.name}s resultat · {resultLabel(current)}</p><p className={`mt-1 font-display text-2xl ${current.winner === "you" ? "text-blue-700" : current.winner === "bot" ? "text-red-700" : "text-slate-800"}`}>{current.winner === "you" ? `${playerName} vinner hålet` : current.winner === "bot" ? `${bot.name} vinner hålet` : "Hålet delas"}</p></div> : null}</section>

          <section className={approachPlay ? "mt-2" : "mt-3"}>'''
t, n = play_pattern.subn(play_ui, t, count=1)
if n != 1:
    raise SystemExit("play UI: expected block not found")

# Sudden death: player is Blue, bot is Red.
t = t.replace('rounded-full bg-red-50 ring-1 ring-red-100"><Target className="h-6 w-6 text-red-600"', 'rounded-full bg-gradient-to-br from-blue-100 to-red-100 ring-1 ring-slate-200"><Target className="h-6 w-6 text-slate-800"')
t = t.replace('text-[10px] font-black uppercase tracking-[0.32em] text-red-600">Sudden death', 'text-[10px] font-black uppercase tracking-[0.32em] text-slate-700">Sudden death')
t = t.replace('className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white disabled:opacity-40"', 'className="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white disabled:opacity-40"')
t = t.replace('{sdBotText ? <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}', '{sdBotText ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-600 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}')
t = t.replace('<div className="mt-4 flex items-start gap-2"><span className="text-3xl">{bot.avatar}</span><div className={`rounded-2xl border p-3 text-sm ${glass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div></div>', '<div className="mt-4 flex items-start justify-end gap-2"><div className={`rounded-2xl border p-3 text-right text-sm ${redGlass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div><span className="text-3xl">{bot.avatar}</span></div>')

# Results: same Red/Blue composition and scorecard as friend Match Play.
result_pattern = re.compile(r'''      \{step === "result" \? \(\n        <>\n.*?\n      \) : null\}\n    </main>''', re.S)
result_ui = '''      {step === "result" ? (
        <>
          <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-300/85 bg-white/90 shadow-[0_22px_52px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl">
            <div className="px-4 pt-4 text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title} · Matchresultat</p></div>
            <div className="mt-3 grid min-h-[104px] grid-cols-[1fr_88px_1fr] items-stretch">
              <div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pr-5 text-center ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{playerName}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "blue" ? "text-white" : "text-blue-700"}`}>{score.you}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "blue" ? "text-blue-100" : "text-slate-500"}`}>vunna hål</p></div>
              <div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><Trophy className="mb-1 h-4 w-4 text-amber-500" /><p className="font-display text-[26px] leading-none text-slate-950">{suddenDeathWinner ? "SD" : `${score.you}–${score.bot}`}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Slutresultat</p></div>
              <div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pl-5 text-center ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{bot.name}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "red" ? "text-white" : "text-red-700"}`}>{score.bot}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "red" ? "text-red-100" : "text-slate-500"}`}>vunna hål</p></div>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 text-center"><p className="text-xs font-bold text-slate-800">{suddenDeathWinner === "you" ? `${playerName} vinner i sudden death` : suddenDeathWinner === "bot" ? `${bot.name} vinner i sudden death` : score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Blue · {playerName} · {score.you} hål&nbsp;&nbsp;•&nbsp;&nbsp;Red · {bot.name} · HCP {formatHcp(bot.hcp)} · {score.bot} hål{score.tie ? ` · ${score.tie} delade` : ""}</p></div>
          </section>

          <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela matchen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{playedHoles} spelade</p></div><div className={`overflow-hidden rounded-[24px] border ${glass}`}><div className="overflow-x-auto"><div className="min-w-max"><div className="grid" style={{ gridTemplateColumns: `minmax(92px,1.35fr) repeat(${length},58px)` }}><div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Hål</div>{holes.map((_, i) => <div key={`rh-${i}`} className="border-b border-r border-slate-200 bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-700">{i + 1}</div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-blue-700 truncate">{playerName}</div>{holes.map((h, i) => <div key={`ry-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 px-1 py-2 text-center text-[9px] font-bold text-blue-700"><span className={`inline-flex min-h-[28px] min-w-[42px] items-center justify-center rounded-md px-1 ${h.winner === "you" ? "bg-blue-600 text-white" : ""}`}>{sideResultLabel(h, "you")}</span></div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-red-700 truncate">{bot.name}</div>{holes.map((h, i) => <div key={`rb-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 px-1 py-2 text-center text-[9px] font-bold text-red-700"><span className={`inline-flex min-h-[28px] min-w-[42px] items-center justify-center rounded-md px-1 ${h.winner === "bot" ? "bg-red-600 text-white" : ""}`}>{sideResultLabel(h, "bot")}</span></div>)}<div className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Vinnare</div>{holes.map((h, i) => <div key={`rw-${i}`} className={`border-r border-slate-200 bg-slate-50 py-2 text-center text-[9px] font-bold ${h.winner === "you" ? "text-blue-700" : h.winner === "bot" ? "text-red-700" : "text-slate-600"}`}>{h.winner === "you" ? "B" : h.winner === "bot" ? "R" : "AS"}</div>)}</div></div></div></div></section>

          {resultRecommendation ? <a href={resultRecommendation.href} onClick={() => recordRecommendationOpen(resultRecommendation.id)} className={`mt-5 flex items-center gap-4 rounded-[26px] border p-4 text-left ${glass}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Nästa</span><span className="mt-1 block font-display text-2xl">{resultRecommendation.title}</span><span className="mt-1 block text-xs text-slate-600">{resultRecommendation.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></a> : null}
          <div className="mt-5 space-y-3"><button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button><button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div>
        </>
      ) : null}
    </main>'''
t, n = result_pattern.subn(result_ui, t, count=1)
if n != 1:
    raise SystemExit("result UI: expected block not found")

# Any leftover emerald accent belongs to the old bot design. Red is the opponent identity.
t = t.replace("emerald-50", "red-50")
t = t.replace("emerald-100", "red-100")
t = t.replace("emerald-500", "red-500")
t = t.replace("emerald-600", "red-600")
t = t.replace("emerald-700", "red-700")
t = t.replace("emerald-800", "red-800")

p.write_text(t)
