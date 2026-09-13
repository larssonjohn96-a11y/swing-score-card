from pathlib import Path

p = Path('src/routes/match-bot.tsx')
t = p.read_text()

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f'{label}: block not found')
    t = t.replace(old, new, 1)

rep(
'import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\n',
'import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";\nimport { getActiveCupMatch, recordActiveCupResult } from "@/lib/cup-engine";\n',
'cup import',
)

rep(
'''  const { displayName } = useAuth();\n  const [step, setStep] = useState<Step>("bot");\n  const [botId, setBotId] = useState("zach");\n''',
'''  const { displayName } = useAuth();\n  const [cupContext] = useState(() => getActiveCupMatch());\n  const [cupRecorded, setCupRecorded] = useState(false);\n  const [step, setStep] = useState<Step>(() => cupContext ? "category" : "bot");\n  const [botId, setBotId] = useState(() => cupContext?.botId ?? "zach");\n''',
'cup initial state',
)

old_effect = '''  useEffect(() => {\n    if (step !== "result") return;\n    recordRecommendationCompletion("play-bot");\n    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);\n  }, [step, resultRecommendation?.id]);\n'''
new_effect = '''  useEffect(() => {\n    if (step !== "result") return;\n    recordRecommendationCompletion("play-bot");\n    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);\n    if (cupContext && !cupRecorded) {\n      recordActiveCupResult(bot.id, resultOutcome);\n      setCupRecorded(true);\n    }\n  }, [step, resultRecommendation?.id, cupContext, cupRecorded, bot.id, resultOutcome]);\n'''
rep(old_effect, new_effect, 'result cup recording')

rep(
'''  function back() {\n    if (step === "category") setStep("bot");\n    else if (step === "setup") setStep("category");\n''',
'''  function back() {\n    if (step === "category") { if (cupContext) window.location.assign("/cup"); else setStep("bot"); }\n    else if (step === "setup") setStep("category");\n''',
'cup back navigation',
)

marker = '''          <section className={`mt-4 overflow-hidden rounded-[26px] border ${redGlass}`}>\n'''
insert = '''          {cupContext ? (\n            <section className="mt-4 overflow-hidden rounded-[26px] border border-amber-300 bg-amber-50/90 p-4 text-center shadow-sm">\n              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">Club Cup · {cupContext.round === "quarterfinal" ? "Kvartsfinal" : cupContext.round === "semifinal" ? "Semifinal" : "Final"}</p>\n              <p className="mt-2 font-display text-2xl text-slate-950">{resultOutcome === "player" ? "Du är vidare" : "Du är utslagen"}</p>\n              <p className="mt-1 text-xs text-slate-600">Resultatet är registrerat i bracketen.</p>\n              <a href="/cup" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-display text-lg text-slate-950 shadow-sm">Till bracket <ChevronRight className="h-4 w-4" /></a>\n            </section>\n          ) : null}\n\n          <section className={`mt-4 overflow-hidden rounded-[26px] border ${redGlass}`}>\n'''
rep(marker, insert, 'cup result banner')

p.write_text(t)
