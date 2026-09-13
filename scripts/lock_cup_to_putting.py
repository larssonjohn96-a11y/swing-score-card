from pathlib import Path

# cup-engine: make tournament format explicit and carry it into active match context
p = Path('src/lib/cup-engine.ts')
t = p.read_text()
t = t.replace('''  currentRound: CupRound;\n};''','''  currentRound: CupRound;\n  category: "putting" | "around-the-green" | "approach" | "off-the-tee";\n  matchLength: 5;\n};''')
t = t.replace('''    currentRound: "quarterfinal",\n    matches:''','''    currentRound: "quarterfinal",\n    category: "putting",\n    matchLength: 5,\n    matches:''')
t = t.replace('''  const active = { cupId: state.id, matchId: match.id, botId: opponent.id, round: match.round };''','''  const active = { cupId: state.id, matchId: match.id, botId: opponent.id, round: match.round, category: state.category, matchLength: state.matchLength };''')
t = t.replace('''export function getActiveCupMatch(): { cupId: string; matchId: string; botId: string; round: CupRound } | null {''','''export function getActiveCupMatch(): { cupId: string; matchId: string; botId: string; round: CupRound; category: CupState["category"]; matchLength: 5 } | null {''')
p.write_text(t)

# cup route: rename and explain fixed event format
p = Path('src/routes/cup.tsx')
t = p.read_text()
t = t.replace('''<h1 className="mt-5 font-display text-4xl">Club Cup</h1>\n        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">8 spelare. Förlust och du är ute. Vinn kvartsfinal, semifinal och final.</p>''','''<h1 className="mt-5 font-display text-4xl">Putting Club Cup</h1>\n        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">8 spelare · Putting Match · 5 hål. Samma format i varje match. Förlust och du är ute.</p>''')
t = t.replace('''<h2 className="mt-4 font-display text-3xl">Din första cup</h2>\n          <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">En enkel 8-manna bracket. Övriga matcher avgörs automatiskt och din väg fortsätter så länge du vinner.</p>''','''<h2 className="mt-4 font-display text-3xl">Putting Club Cup</h2>\n          <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">8-manna knockout. Alla spelar samma Putting Match över 5 hål. Övriga matcher avgörs automatiskt.</p>''')
t = t.replace('''Starta Club Cup''','''Starta Putting Cup''')
p.write_text(t)

# tournaments route: make first cup visibly a putting-only event
p = Path('src/routes/turneringar.tsx')
t = p.read_text()
t = t.replace('''<h1 className="mt-1 font-display text-4xl">Turneringar</h1>''','''<h1 className="mt-1 font-display text-4xl">Turneringar</h1>''')
# Replace first upcoming card if current route already contains cup link text from earlier integration; otherwise leave intact
repls = {
    'Club Cup': 'Putting Club Cup',
    '8 spelare · Kvartsfinal → semifinal → final': '8 spelare · Putting Match · 5 hål · Kvartsfinal → semifinal → final',
}
for a,b in repls.items():
    t = t.replace(a,b)
p.write_text(t)

# match-bot: cup skips category and length selection and launches fixed 5-hole putting immediately
p = Path('src/routes/match-bot.tsx')
t = p.read_text()
t = t.replace('''  const [step, setStep] = useState<Step>(() => cupContext ? "category" : "bot");\n  const [botId, setBotId] = useState(() => cupContext?.botId ?? "zach");\n  const [category, setCategory] = useState<Category | null>(null);\n  const [length, setLength] = useState<MatchLength>(5);''','''  const [step, setStep] = useState<Step>(() => cupContext ? "length" : "bot");\n  const [botId, setBotId] = useState(() => cupContext?.botId ?? "zach");\n  const [category, setCategory] = useState<Category | null>(() => cupContext?.category ?? null);\n  const [length, setLength] = useState<MatchLength>(() => cupContext?.matchLength ?? 5);''')
needle = '''  const [botComment, setBotComment] = useState(() => { const initial = selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]; return personalityLine(initial.id, "start") ?? randomLine(initial.chat.start); });\n'''
insert = needle + '''\n  useEffect(() => {\n    if (!cupContext) return;\n    buildHoles();\n    // Cup format is fixed by the tournament: no category or length selection.\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);\n'''
if needle not in t:
    raise SystemExit('bot comment anchor not found')
t = t.replace(needle, insert, 1)
# Back in cup should always leave to bracket rather than selection steps
t = t.replace('''  function back() {\n    if (step === "category") { if (cupContext) window.location.assign("/cup"); else setStep("bot"); }''','''  function back() {\n    if (cupContext) { window.location.assign("/cup"); return; }\n    if (step === "category") setStep("bot");''')
p.write_text(t)
