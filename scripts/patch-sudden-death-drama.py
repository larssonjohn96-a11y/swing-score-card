from pathlib import Path
import re

# Friend/team match
p = Path('src/routes/match.tsx')
t = p.read_text()

state_marker = '  const [sdMessage, setSdMessage] = useState("");\n'
if state_marker in t and 'showSuddenDeathIntro' not in t:
    t = t.replace(state_marker, state_marker + '  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);\n', 1)

# Dramatic intro whenever sudden death begins.
effect_marker = '  const [isSubmitting, setIsSubmitting] = useState(false);\n'
if effect_marker in t and 'setShowSuddenDeathIntro(true)' not in t:
    t = t.replace(effect_marker, effect_marker + '''\n  useEffect(() => {\n    if (step !== "sudden-death") return;\n    setShowSuddenDeathIntro(true);\n    const timer = window.setTimeout(() => setShowSuddenDeathIntro(false), 1450);\n    return () => window.clearTimeout(timer);\n  }, [step, suddenDeathRound]);\n''', 1)

# Sudden death is intentionally outcome-only and excluded from normal hole/stat scoring.
t = re.sub(
    r'  function recordSuddenDeath\(\) \{.*?\n  \}\n\n  function rematch\(\) \{',
    '''  function recordSuddenDeath(outcome: "blue" | "red" | "tie") {\n    if (outcome === "tie") {\n      setSdMessage("Båda satte den · vi fortsätter");\n      window.setTimeout(() => {\n        setSuddenDeathRound((r) => r + 1);\n        setSdMessage("");\n      }, 900);\n      return;\n    }\n    setFinalText(`${outcome === "blue" ? blueLabel : redLabel} vinner i sudden death · närmast hålet`);\n    setStep("result");\n  }\n\n  function rematch() {''',
    t,
    count=1,
    flags=re.S,
)

sd_ui = '''    {step === "sudden-death" ? <>\n      {showSuddenDeathIntro ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-md">\n        <div className="animate-in zoom-in-75 fade-in duration-500">\n          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.35)]"><Target className="h-9 w-9 animate-pulse text-red-400" /></div>\n          <p className="text-[11px] font-black uppercase tracking-[0.38em] text-red-400">Matchen är lika</p>\n          <h1 className="mt-3 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>\n          <p className="mt-4 text-sm font-bold text-slate-300">Ett slag. Närmast hålet vinner allt.</p>\n        </div>\n      </div> : null}\n      <section className="pt-3 text-center">\n        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100"><Target className="h-6 w-6 text-red-600" /></div>\n        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.32em] text-red-600">Sudden death</p>\n        <h1 className="mt-1 font-display text-5xl leading-none">11 meter</h1>\n        <p className="mt-3 text-sm font-semibold text-slate-700">Ett slag var · närmast hålet vinner matchen</p>\n        <div className="mx-auto mt-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Avgörande {suddenDeathRound}</div>\n      </section>\n\n      <section className={`mt-6 rounded-[30px] border p-4 shadow-xl shadow-slate-200/50 ${glass}`}>\n        <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Vem var närmast hålet?</p>\n        <div className="mt-4 grid grid-cols-2 gap-3">\n          <button onClick={() => recordSuddenDeath("blue")} className={`min-h-28 rounded-[24px] border p-4 text-center transition active:scale-[0.98] ${blueGlass}`}>\n            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-blue-500">Närmast</span>\n            <span className="mt-2 block font-display text-2xl leading-tight text-blue-700">{blueLabel}</span>\n          </button>\n          <button onClick={() => recordSuddenDeath("red")} className={`min-h-28 rounded-[24px] border p-4 text-center transition active:scale-[0.98] ${redGlass}`}>\n            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-red-500">Närmast</span>\n            <span className="mt-2 block font-display text-2xl leading-tight text-red-700">{redLabel}</span>\n          </button>\n        </div>\n        <button onClick={() => recordSuddenDeath("tie")} className="mt-3 w-full rounded-[22px] border border-slate-300 bg-white/90 px-4 py-4 text-center transition active:scale-[0.99]">\n          <span className="block font-display text-xl text-slate-950">Lika</span>\n          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Båda satte den</span>\n        </button>\n      </section>\n      {sdMessage ? <div className="mt-4 animate-pulse rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm font-black text-amber-800">{sdMessage}</div> : null}\n      <p className="mt-4 text-center text-[10px] font-semibold text-slate-400">Sudden Death avgör endast matchen och räknas inte in i ordinarie statistik.</p>\n    </> : null}\n\n'''

t, n = re.subn(r'    \{step === "sudden-death" \? <>.*?    \{step === "result" \? <>', sd_ui + '    {step === "result" ? <>', t, count=1, flags=re.S)
if n != 1:
    raise SystemExit('friend sudden death UI marker missing')
p.write_text(t)

# Bot match: keep simulated closest-to-pin logic, but make entry/transition feel like an event.
p = Path('src/routes/match-bot.tsx')
t = p.read_text()
if 'import { useMemo, useState } from "react";' in t:
    t = t.replace('import { useMemo, useState } from "react";', 'import { useEffect, useMemo, useState } from "react";', 1)

state_marker = '  const [suddenDeathWinner, setSuddenDeathWinner] = useState<"you" | "bot" | null>(null);\n'
if state_marker in t and 'showSuddenDeathIntro' not in t:
    t = t.replace(state_marker, state_marker + '  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);\n', 1)

bot_effect_marker = '  const [botComment, setBotComment] = useState(() => randomLine((selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]).chat.start));\n'
if bot_effect_marker in t and 'setShowSuddenDeathIntro(true)' not in t:
    t = t.replace(bot_effect_marker, bot_effect_marker + '''\n  useEffect(() => {\n    if (step !== "sudden-death") return;\n    setShowSuddenDeathIntro(true);\n    const timer = window.setTimeout(() => setShowSuddenDeathIntro(false), 1450);\n    return () => window.clearTimeout(timer);\n  }, [step, suddenDeathRound]);\n''', 1)

bot_sd_ui = '''      {step === "sudden-death" ? (\n        <>\n          {showSuddenDeathIntro ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-md">\n            <div className="animate-in zoom-in-75 fade-in duration-500">\n              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.35)]"><Target className="h-9 w-9 animate-pulse text-red-400" /></div>\n              <p className="text-[11px] font-black uppercase tracking-[0.38em] text-red-400">Matchen är lika</p>\n              <h1 className="mt-3 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>\n              <p className="mt-4 text-sm font-bold text-slate-300">Ett slag. Närmast hålet vinner allt.</p>\n            </div>\n          </div> : null}\n          <section className="pt-3 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100"><Target className="h-6 w-6 text-red-600" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[0.32em] text-red-600">Sudden death</p><h1 className="mt-1 font-display text-5xl leading-none">11 meter</h1><p className="mt-3 text-sm font-semibold text-slate-700">Du slår först · {bot.name} svarar efteråt</p><div className="mx-auto mt-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Avgörande {suddenDeathRound}</div></section>\n          <section className={`mt-6 rounded-[28px] border p-5 shadow-xl shadow-slate-200/50 ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Ditt slag</p><p className="mt-1 text-sm text-slate-600">Registrera hur nära hålet du kom. Resultatet används bara för att avgöra matchen.</p><button disabled={sdBusy} onClick={() => void playSuddenDeath(null)} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white disabled:opacity-40">Sänkt</button><div className="mt-2 grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2, 3, 5, 8, 11].map((v) => <button disabled={sdBusy} key={v} onClick={() => void playSuddenDeath(v)} className="rounded-xl border border-slate-200 bg-white/90 py-3 text-xs font-bold disabled:opacity-40">{v} m</button>)}</div></section>\n          {sdBotText ? <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}\n          <div className="mt-4 flex items-start gap-2"><span className="text-3xl">{bot.avatar}</span><div className={`rounded-2xl border p-3 text-sm ${glass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div></div>\n          <p className="mt-4 text-center text-[10px] font-semibold text-slate-400">Sudden Death avgör endast matchen och räknas inte in i ordinarie statistik.</p>\n        </>\n      ) : null}\n'''

t, n = re.subn(r'      \{step === "sudden-death" \? \(.*?      \) : null\}\n\n      \{step === "result"', bot_sd_ui + '\n      {step === "result"', t, count=1, flags=re.S)
if n != 1:
    raise SystemExit('bot sudden death UI marker missing')
p.write_text(t)
