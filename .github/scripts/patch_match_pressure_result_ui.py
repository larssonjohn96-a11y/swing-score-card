from pathlib import Path

path = Path('src/routes/match.tsx')
s = path.read_text()

old_style = '''      <style>{`@keyframes sg4PressureRoll{from{clip-path:inset(0 100% 0 0);opacity:.4}to{clip-path:inset(0 0 0 0);opacity:1}}@keyframes sg4PressurePulse{0%,100%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}12%{box-shadow:0 12px 28px -18px rgba(245,158,11,.72),0 0 0 3px rgba(250,204,21,.55)}22%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 1px rgba(250,204,21,.15)}32%{box-shadow:0 12px 28px -18px rgba(245,158,11,.68),0 0 0 2px rgba(250,204,21,.38)}44%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}}`}</style>'''
new_style = '''      <style>{`@keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}@keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.12}48%{opacity:.34}78%{opacity:.12}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}`}</style>'''
if old_style not in s:
    raise SystemExit('pressure style anchor not found')
s = s.replace(old_style, new_style, 1)

old_pressure = '''        {pressureNotice && scoringMode === "match" ? <div className="mt-2 overflow-hidden"><div className="rounded-[16px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-3 py-2 text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureRoll 460ms cubic-bezier(.22,.8,.3,1) both, sg4PressurePulse 1.7s ease-in-out 460ms infinite" }}><div className="flex items-center gap-2"><div className="shrink-0"><span className="inline-flex items-center rounded-full bg-slate-950/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950">Pressläge · Nu gäller det</span></div><p className="min-w-0 flex-1 text-[10px] font-bold leading-tight text-slate-900">{pressureNotice}</p></div></div></div> : null}'''
new_pressure = '''        {pressureNotice && scoringMode === "match" ? <div className="mt-2 overflow-hidden"><div key={`pressure-${holeIndex}-${pressureNotice}`} className="relative overflow-hidden rounded-[18px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-4 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-transparent via-white/65 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.05s cubic-bezier(.2,.75,.25,1) 150ms both" }} /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">Pressläge · Hål {holeIndex + 1}</p><p className="mt-1 text-[10px] font-bold leading-snug text-slate-800">{pressureNotice}</p><p className="mt-1 text-[9px] font-semibold text-slate-700">{Math.abs(diff)} {Math.abs(diff) === 1 ? "hål" : "hål"} skiljer · {holesRemaining} kvar efter detta</p></div></div></div> : null}'''
if old_pressure not in s:
    raise SystemExit('pressure card anchor not found')
s = s.replace(old_pressure, new_pressure, 1)

old_left = '''<div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pr-6 ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>'''
new_left = '''<div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pr-5 text-center ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>'''
if old_left not in s:
    raise SystemExit('result left anchor not found')
s = s.replace(old_left, new_left, 1)

old_right = '''<div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pl-6 text-right ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>'''
new_right = '''<div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pl-5 text-center ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>'''
if old_right not in s:
    raise SystemExit('result right anchor not found')
s = s.replace(old_right, new_right, 1)

path.write_text(s)
