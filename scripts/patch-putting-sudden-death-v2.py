from pathlib import Path
import re


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing marker: {label}')
    return text.replace(old, new)

# Friend/team match
p = Path('src/routes/match.tsx')
t = p.read_text()

# Compact putting length chooser.
t = t.replace('import { PUTTING_MATCH_FORMATS, PUTTING_MATCH_RULES, formatPuttingDistance, generatePuttingMatchDistances } from "@/lib/putting-match";', 'import { formatPuttingDistance, generatePuttingMatchDistances } from "@/lib/putting-match";')
t = t.replace('Välj matchlängd', 'Välj antal hål')
t = re.sub(r'<p className="mt-2 text-sm text-slate-600">Samma spel varje gång[^<]*</p>', '', t)

putting_block = re.compile(r'<div className="mt-5 space-y-3">\{PUTTING_MATCH_FORMATS\.map\(\(f\) => <button.*?</div>\n\s*<div className=\{`mt-4 rounded-\[24px\] border p-4 \$\{glass\}`\}>.*?</div>', re.S)
putting_replacement = '''<div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 7] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`relative rounded-3xl border px-2 py-6 text-center ${matchLength === v ? selectedRing : glass}`}>{matchLength === v ? <SelectedCheck className="absolute right-1.5 top-1.5" /> : null}<span className="block whitespace-nowrap font-display text-3xl leading-none">{v} <span className="text-xl">hål</span></span>{v === 3 ? <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Snabb</span> : v === 5 ? <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">Standard</span> : null}</button>)}</div>'''
t, n = putting_block.subn(putting_replacement, t, count=1)
if n != 1:
    raise SystemExit('putting chooser block not found')

# Make live scoring names more prominent while keeping the whole scoring view compact.
t = t.replace('text-[10px] font-black uppercase tracking-[0.14em] text-blue-700', 'text-sm font-black tracking-tight text-blue-700')
t = t.replace('text-[10px] font-black uppercase tracking-[0.14em] text-red-700', 'text-sm font-black tracking-tight text-red-700')
t = t.replace('mt-3 grid grid-cols-2 gap-3', 'mt-4 grid grid-cols-2 gap-4')
t = t.replace('mt-4 grid grid-cols-2 gap-3', 'mt-5 grid grid-cols-2 gap-4')

# Longer, more theatrical Sudden Death transition.
t = t.replace('setShowSuddenDeathIntro(false), 1450', 'setShowSuddenDeathIntro(false), 2400')

old_intro = '''{showSuddenDeathIntro ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-md">
        <div className="animate-in zoom-in-75 fade-in duration-500">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.35)]"><Target className="h-9 w-9 animate-pulse text-red-400" /></div>
          <p className="text-[11px] font-black uppercase tracking-[0.38em] text-red-400">Matchen är lika</p>
          <h1 className="mt-3 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>
          <p className="mt-4 text-sm font-bold text-slate-300">Ett slag. Närmast hålet vinner allt.</p>
        </div>
      </div> : null}'''
new_intro = '''{showSuddenDeathIntro ? <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/95 backdrop-blur-md">
        <style>{`@keyframes sdBlueRush{0%{transform:translateX(-115%)}38%{transform:translateX(5%)}52%{transform:translateX(-2%)}64%{transform:translateX(2%)}100%{transform:translateX(0)}}@keyframes sdRedRush{0%{transform:translateX(115%)}38%{transform:translateX(-5%)}52%{transform:translateX(2%)}64%{transform:translateX(-2%)}100%{transform:translateX(0)}}@keyframes sdClash{0%,34%{opacity:0;transform:scale(.2) rotate(0deg)}45%{opacity:1;transform:scale(1.5) rotate(25deg)}62%{opacity:.95;transform:scale(.9) rotate(-15deg)}100%{opacity:.35;transform:scale(1.2) rotate(15deg)}}@keyframes sdTitle{0%,54%{opacity:0;transform:scale(.82) translateY(12px)}72%{opacity:1;transform:scale(1.06) translateY(0)}100%{opacity:1;transform:scale(1)}}@keyframes sdSparkL{0%,38%{opacity:0;transform:translate(0,0) scale(.4)}50%{opacity:1}100%{opacity:0;transform:translate(-42px,-34px) scale(1.25)}}@keyframes sdSparkR{0%,38%{opacity:0;transform:translate(0,0) scale(.4)}50%{opacity:1}100%{opacity:0;transform:translate(42px,34px) scale(1.25)}}`}</style>
        <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500/80" style={{animation:'sdBlueRush 1.35s cubic-bezier(.22,.8,.28,1) both',clipPath:'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)'}} />
        <div className="absolute inset-y-0 right-0 w-[56%] bg-gradient-to-l from-red-700 via-red-600 to-red-500/80" style={{animation:'sdRedRush 1.35s cubic-bezier(.22,.8,.28,1) both',clipPath:'polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)'}} />
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-amber-200" style={{animation:'sdClash 1.8s ease-out both'}}>
          <span className="block text-7xl drop-shadow-[0_0_22px_rgba(253,224,71,.9)]">✦</span>
          <span className="absolute -left-2 top-4 text-xl" style={{animation:'sdSparkL 1.5s .15s ease-out both'}}>✦</span>
          <span className="absolute -right-2 bottom-2 text-lg" style={{animation:'sdSparkR 1.5s .12s ease-out both'}}>✦</span>
          <span className="absolute left-3 -top-2 text-sm" style={{animation:'sdSparkR 1.35s .2s ease-out both'}}>✦</span>
          <span className="absolute right-2 top-0 text-base" style={{animation:'sdSparkL 1.4s .18s ease-out both'}}>✦</span>
        </div>
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center" style={{animation:'sdTitle 2.15s ease-out both'}}>
          <div className="rounded-[32px] border border-white/20 bg-slate-950/50 px-7 py-6 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-white/70">AVGÖRANDE</p>
            <h1 className="mt-2 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>
            <p className="mt-4 text-sm font-black text-white">Närmast hålet vinner matchen</p>
          </div>
        </div>
      </div> : null}'''
t = replace_required(t, old_intro, new_intro, 'friend sudden death intro')
t = t.replace('<p className="mt-4 text-center text-[10px] font-semibold text-slate-400">Sudden Death avgör endast matchen och räknas inte in i ordinarie statistik.</p>\n', '')
p.write_text(t)

# Bot match gets the same dramatic transition and no stats disclaimer.
p = Path('src/routes/match-bot.tsx')
t = p.read_text()
t = t.replace('setShowSuddenDeathIntro(false), 1450', 'setShowSuddenDeathIntro(false), 2400')
old_bot_intro = '''{showSuddenDeathIntro ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-md">
            <div className="animate-in zoom-in-75 fade-in duration-500">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.35)]"><Target className="h-9 w-9 animate-pulse text-red-400" /></div>
              <p className="text-[11px] font-black uppercase tracking-[0.38em] text-red-400">Matchen är lika</p>
              <h1 className="mt-3 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>
              <p className="mt-4 text-sm font-bold text-slate-300">Ett slag. Närmast hålet vinner allt.</p>
            </div>
          </div> : null}'''
new_bot_intro = new_intro.replace('{showSuddenDeathIntro ? ', '{showSuddenDeathIntro ? ').replace('\n        <style>', '\n            <style>').replace('\n        <div className="absolute', '\n            <div className="absolute').replace('\n        </div>\n      </div> : null}', '\n            </div>\n          </div> : null}')
# Use whitespace-tolerant replacement for the bot version.
if old_bot_intro not in t:
    raise SystemExit('bot sudden death intro not found')
t = t.replace(old_bot_intro, new_bot_intro)
t = t.replace('<p className="mt-4 text-center text-[10px] font-semibold text-slate-400">Sudden Death avgör endast matchen och räknas inte in i ordinarie statistik.</p>\n', '')
p.write_text(t)
