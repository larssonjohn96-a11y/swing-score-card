from pathlib import Path
import re

p = Path('src/routes/match.tsx')
s = p.read_text()

s = s.replace(
    'description: "Baserat på PGA Tour-avstånd · mix av korta, mellanlånga och långa puttar · 9 eller 18 hål"',
    'description: "Baserat på PGA Tour-avstånd · mix av korta, mellanlånga och långa puttar · 5, 9 eller 18 hål"',
    1,
)

old_state = '''  const matchLeader = diff > 0 ? "blue" : diff < 0 ? "red" : null;
  const trailingLabel = diff > 0 ? redLabel : diff < 0 ? blueLabel : "";
  const pressureNotice = scoringMode !== "match" || holesRemaining <= 0 ? null
    : diff === 0 && holesRemaining === 1
      ? "Sista hålet avgör matchen."
      : Math.abs(diff) === holesRemaining
        ? `${trailingLabel} måste vinna nästa hål – annars är matchen över.`
        : Math.abs(diff) === holesRemaining - 1 && Math.abs(diff) > 0
          ? `${trailingLabel} måste vinna eller dela nästa hål för att hålla matchen vid liv.`
          : null;'''
new_state = '''  const matchLeader = diff > 0 ? "blue" : diff < 0 ? "red" : null;
  const leadingLabel = diff > 0 ? blueLabel : diff < 0 ? redLabel : "";
  const trailingLabel = diff > 0 ? redLabel : diff < 0 ? blueLabel : "";
  const pressureNotice = scoringMode !== "match" || holesRemaining <= 0 ? null
    : diff === 0 && holesRemaining === 1
      ? "Sista hålet avgör matchen."
      : Math.abs(diff) === holesRemaining
        ? `${leadingLabel} kan avgöra matchen nu. ${trailingLabel} måste vinna hålet.`
        : Math.abs(diff) === holesRemaining - 1 && Math.abs(diff) > 0
          ? `${trailingLabel} måste vinna eller dela hålet för att hålla matchen vid liv.`
          : null;
  const strokeLeader = category === "around-the-green"
    ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
    : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const liveLeader = scoringMode === "match" ? matchLeader : strokeLeader;
  const topScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : `${Math.abs(diff)} UP`
    : category === "around-the-green" ? `${score.bluePoints}–${score.redPoints}` : `${score.blueStrokes}–${score.redStrokes}`;
  const topScoreMeta = scoringMode === "match"
    ? `Hål ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`
    : category === "around-the-green" ? "Poäng" : "Slag";'''
if old_state not in s:
    raise SystemExit('state anchor not found')
s = s.replace(old_state, new_state, 1)

old_header = '''{step === "play" && current ? <><header className="relative text-center"><Link to="/" aria-label="Till startsidan" className={`absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass}`}>‹</Link><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{scoringMode === "match" ? "Match Play" : "Slagspel"} · {selectedCategory?.title}</p><div className="mt-2 inline-flex items-baseline gap-2 rounded-full border border-slate-300/80 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-xl"><span className="font-display text-2xl">{unitLabel} {holeIndex + 1}</span><span className="text-xs font-semibold text-slate-500">av {matchLength}</span></div>{editingHoleIndex !== null ? <div className="mx-auto mt-3 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">Redigerar {unitLabel.toLowerCase()} {holeIndex + 1}</div> : null}</header>
      {scoringMode === "match" ? <section className="mt-4"><div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-slate-300/85 bg-white/76 px-3 py-2.5 shadow-[0_12px_30px_-26px_rgba(15,23,42,.5)] backdrop-blur-2xl"><div className="flex min-w-0 items-center justify-end gap-2 text-right">{matchLeader === "blue" ? <span className="h-0 w-0 shrink-0 border-y-[5px] border-r-[8px] border-y-transparent border-r-red-500" /> : null}<span className={`truncate text-xs font-bold ${matchLeader === "blue" ? "text-slate-950" : "text-slate-500"}`}>{blueLabel}</span></div><div className="mx-3 min-w-16 rounded-xl bg-slate-950 px-3 py-2 text-center text-white"><span className="block font-display text-lg leading-none">{diff === 0 ? "AS" : `${Math.abs(diff)} UP`}</span></div><div className="flex min-w-0 items-center gap-2 text-left"><span className={`truncate text-xs font-bold ${matchLeader === "red" ? "text-slate-950" : "text-slate-500"}`}>{redLabel}</span>{matchLeader === "red" ? <span className="h-0 w-0 shrink-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-red-500" /> : null}</div></div>{pressureNotice ? <div className="mt-2 rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-center"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-red-600">Pressläge</p><p className="mt-1 text-[11px] font-semibold leading-snug text-red-800">{pressureNotice}</p></div> : null}</section> : null}'''
new_header = '''{step === "play" && current ? <><header className="relative flex h-9 items-center justify-center"><Link to="/" aria-label="Till startsidan" className={`absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xl leading-none ${glass}`}>‹</Link><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{scoringMode === "match" ? "Match Play" : "Slagspel"} · {selectedCategory?.title}</p>{editingHoleIndex !== null ? <div className="absolute right-0 top-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">Redigerar</div> : null}</header>
      <style>{`@keyframes sg4Heartbeat{0%,100%{transform:scale(1)}8%{transform:scale(1.035)}16%{transform:scale(1)}24%{transform:scale(1.02)}36%{transform:scale(1)}}`}</style>
      <section className="mt-1">
        {pressureNotice && scoringMode === "match" ? <div className="overflow-hidden rounded-[20px] border border-red-300/70 bg-slate-950 text-white shadow-[0_16px_38px_-28px_rgba(220,38,38,.85)]"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[9px] font-bold"><span className="max-w-[31%] truncate text-blue-200">{blueLabel}</span><span className="rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] text-white">{topScoreText} · {Math.min(holeIndex + 1, matchLength)}/{matchLength}</span><span className="max-w-[31%] truncate text-right text-red-200">{redLabel}</span></div><div className="px-4 py-3 text-center" style={{ animation: "sg4Heartbeat 1.7s ease-in-out infinite" }}><div className="flex items-center justify-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span><p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Nu gäller det</p></div><p className="mx-auto mt-1.5 max-w-[310px] text-[12px] font-bold leading-snug text-white">{pressureNotice}</p></div></div> : <div className="overflow-hidden rounded-[20px] border border-slate-300/80 bg-white/85 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)] backdrop-blur-2xl"><div className="grid min-h-[62px] grid-cols-[1fr_82px_1fr] items-stretch"><div style={liveLeader === "blue" ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined} className={`flex min-w-0 items-center px-3 pr-5 ${liveLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[10px] font-extrabold uppercase leading-tight ${liveLeader === "blue" ? "text-white" : "text-slate-700"}`}>{blueLabel}</p>{liveLeader === "blue" ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-blue-100">leder</p> : null}</div></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{topScoreMeta}</p><p className={`mt-0.5 font-display text-[22px] leading-none ${liveLeader === "red" ? "text-red-600" : liveLeader === "blue" ? "text-blue-600" : "text-slate-950"}`}>{topScoreText}</p></div><div style={liveLeader === "red" ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" } : undefined} className={`flex min-w-0 items-center justify-end px-3 pl-5 text-right ${liveLeader === "red" ? "bg-red-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[10px] font-extrabold uppercase leading-tight ${liveLeader === "red" ? "text-white" : "text-slate-700"}`}>{redLabel}</p>{liveLeader === "red" ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-red-100">leder</p> : null}</div></div></div><div className="flex items-center justify-center gap-[3px] border-t border-slate-200/80 px-2 py-2">{holes.map((h, i) => <span key={`live-${i}`} className={`flex items-center justify-center rounded-full font-bold ${matchLength === 18 ? "h-3.5 w-3.5 text-[7px]" : "h-5 w-5 text-[8px]"} ${h.winner === "blue" ? "bg-blue-600 text-white" : h.winner === "red" ? "bg-red-600 text-white" : h.winner === "tie" ? "bg-slate-300 text-slate-700" : i === holeIndex ? "border border-slate-500 bg-white text-slate-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>)}</div></div>}
      </section>'''
if old_header not in s:
    raise SystemExit('play header anchor not found')
s = s.replace(old_header, new_header, 1)

# Remove the large duplicated live standings + scorecard under registration.
pattern = re.compile(r'''\n      <section className=\\"mt-6\\"><div className=\\"mb-3 text-center\\"><h2 className=\\"font-display text-2xl\\">Ställning</h2>.*?</section>\n      \{isPutting && scoringMode === \\"stroke\\" && score\.played > 0 \? <p className=\\"mt-3 text-center text-\[10px\] font-semibold text-slate-500\\">.*? : null\}''', re.S)
# Source is normal TSX text, not JSON-escaped, so use a second pattern if needed.
match = pattern.search(s)
if match:
    s = s[:match.start()] + '\n      {isScoredHole && lastScoredHoleIndex >= 0 ? <button type="button" disabled={isSubmitting} onClick={() => editScoredHole(lastScoredHoleIndex)} className="mt-2 w-full py-2 text-center text-[10px] font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 disabled:opacity-40">Redigera senaste {unitLabel.toLowerCase()}</button> : null}' + s[match.end():]
else:
    start = s.find('\n      <section className="mt-6"><div className="mb-3 text-center"><h2 className="font-display text-2xl">Ställning</h2>')
    end_marker = '\n      {isPutting && scoringMode === "stroke" && score.played > 0 ? <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">'
    if start == -1:
        raise SystemExit('standings start anchor not found')
    end_start = s.find(end_marker, start)
    if end_start == -1:
        raise SystemExit('standings trailing note anchor not found')
    end = s.find('</> : null}', end_start)
    # Do not consume the play fragment close; only consume the trailing note expression up to its own : null}
    note_end = s.find(' : null}', end_start)
    if note_end == -1:
        raise SystemExit('standings trailing note end not found')
    note_end += len(' : null}')
    replacement = '\n      {isScoredHole && lastScoredHoleIndex >= 0 ? <button type="button" disabled={isSubmitting} onClick={() => editScoredHole(lastScoredHoleIndex)} className="mt-2 w-full py-2 text-center text-[10px] font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 disabled:opacity-40">Redigera senaste {unitLabel.toLowerCase()}</button> : null}'
    s = s[:start] + replacement + s[note_end:]

p.write_text(s)
