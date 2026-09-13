from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

old_intro = '''          <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl">Spela mot en bot</h1><p className="mt-2 text-sm text-slate-600">Välj en golfare. Varje bot har egen HCP, spelstil och styrkor.</p></section>\n          <div className="mt-5 space-y-6">'''
new_intro = '''          <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl">Spela mot en bot</h1><p className="mt-2 text-sm text-slate-600">Välj en golfare. Varje bot har egen HCP, spelstil och styrkor.</p></section>\n          <section className={`sticky top-3 z-30 mt-4 rounded-[24px] border px-4 py-3 ${glass}`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-display text-xl">{bot.name}</p>
                  <p className="shrink-0 text-xs font-black text-red-700">HCP {formatHcp(bot.hcp)}</p>
                </div>
                <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{BOT_PERSONALITIES[bot.id]?.oneLiner}</p>
                {relationshipLine(bot.id, bot.name) ? <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-500">{relationshipLine(bot.id, bot.name)}</p> : null}
              </div>
            </div>
          </section>\n          <div className="mt-4 space-y-6">'''
if old_intro not in t:
    raise SystemExit('intro block not found')
t = t.replace(old_intro, new_intro, 1)

old_detail = '''          <section className={`mt-6 rounded-[28px] border p-4 ${glass}`}><div className="flex items-start gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="font-display text-xl">{bot.name}</p><p className="text-xs font-bold text-red-700">HCP {formatHcp(bot.hcp)} · {bot.role}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{BOT_PERSONALITIES[bot.id]?.oneLiner}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p>{relationshipLine(bot.id, bot.name) ? <p className="mt-2 text-[11px] font-semibold text-slate-500">{relationshipLine(bot.id, bot.name)}</p> : null}<div className="mt-3 flex flex-wrap gap-1.5">{archetypeLabels(bot.archetype).map((trait) => <span key={trait} className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div></div></div></section>\n'''
if old_detail not in t:
    raise SystemExit('detail block not found')
t = t.replace(old_detail, '', 1)

p.write_text(t)
