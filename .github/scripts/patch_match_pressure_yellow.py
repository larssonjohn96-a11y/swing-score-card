from pathlib import Path
p = Path('src/routes/match.tsx')
s = p.read_text()

repls = [
    ('border border-red-300/80 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-3 py-2 text-white shadow-[0_12px_28px_-20px_rgba(220,38,38,.8)]',
     'border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-3 py-2 text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]'),
    ('bg-white/16 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
     'bg-slate-950/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950'),
    ('text-[10px] font-bold leading-tight text-white/95',
     'text-[10px] font-bold leading-tight text-slate-900'),
    ('{!isShortGame ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{current.challenge.eyebrow}</p> : null}',
     '{!isShortGame && !isPgaPutting ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{current.challenge.eyebrow}</p> : null}'),
]
for old, new in repls:
    if old not in s:
        raise SystemExit(f'anchor not found: {old[:80]}')
    s = s.replace(old, new, 1)

p.write_text(s)
