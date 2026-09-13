from pathlib import Path

p = Path('src/routes/match.tsx')
t = p.read_text()

repls = {
    'detail: `Samma position för båda · håla ut · färre puttar vinner hålet${suffix}`': 'detail: `Samma position · håla ut · färre puttar vinner${suffix}`',
    'className={`rounded-[32px] border text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${tight ? "mt-1.5 p-2" : compact ? "mt-2 p-3" : "mt-4 p-5"} ${isPutting || isShortGame || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}': 'className={`rounded-[32px] border text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${tight ? (isPutting ? "mt-1.5 p-3" : "mt-1.5 p-2") : compact ? (isPutting ? "mt-2 p-4" : "mt-2 p-3") : "mt-4 p-5"} ${isPutting || isShortGame || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}',
    '${compact ? (isShortGame ? "text-3xl" : "text-4xl") : isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}': '${isPutting ? (compact || tight ? "text-5xl" : "text-6xl") : compact ? (isShortGame ? "text-3xl" : "text-4xl") : isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}',
    'max-w-[68%] truncate font-display text-xl leading-none': 'max-w-[68%] truncate font-display text-[34px] leading-none',
}

for old, new in repls.items():
    if old not in t:
        raise SystemExit(f'missing marker: {old[:80]}')
    t = t.replace(old, new)

p.write_text(t)
