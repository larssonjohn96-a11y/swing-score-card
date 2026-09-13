from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected block not found")
    return text.replace(old, new, 1)


# Home: one primary recommendation + two secondary choices, then normal navigation.
p = Path("src/routes/index.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";\n',
    'import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";\nimport { getHomeRecommendations } from "@/lib/sg4-surface-recommendations";\nimport { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
    "home imports",
)
t = replace_once(
    t,
    '  const profile = loadCardProfile();\n\n  useEffect(() => {\n',
    '  const profile = loadCardProfile();\n  const recommendations = getHomeRecommendations(3);\n  const primaryRecommendation = recommendations[0];\n  const secondaryRecommendations = recommendations.slice(1);\n  const recommendationKey = recommendations.map((item) => item.id).join("|");\n\n  useEffect(() => {\n    if (recommendationKey) recordRecommendationImpressions(recommendationKey.split("|"));\n  }, [recommendationKey]);\n\n  useEffect(() => {\n',
    "home recommendation state",
)
marker = '    <ActiveMultiplayerBanner />\n\n'
insert = '''    <ActiveMultiplayerBanner />

    {primaryRecommendation ? <section className="mt-5">
      <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Fortsätt</p><h2 className="mt-1 font-display text-3xl">Kör nästa</h2></div></div>
      <a href={primaryRecommendation.href} onClick={() => recordRecommendationOpen(primaryRecommendation.id)} className="group block overflow-hidden rounded-[30px] border border-primary/25 bg-gradient-to-br from-primary/[.12] via-card to-primary/[.04] p-5 shadow-[0_24px_50px_-32px_rgba(0,0,0,.5)] active:scale-[.99]">
        <div className="flex items-center justify-between"><span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-primary-foreground">{primaryRecommendation.label}</span><ChevronRight className="h-5 w-5 text-primary transition-transform group-active:translate-x-1" /></div>
        <h3 className="mt-6 font-display text-4xl leading-none">{primaryRecommendation.title}</h3>
        <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{primaryRecommendation.detail}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">Starta <ChevronRight className="h-4 w-4" /></span>
      </a>
      {secondaryRecommendations.length ? <div className="mt-3 grid grid-cols-2 gap-3">{secondaryRecommendations.map((item) => <a key={item.id} href={item.href} onClick={() => recordRecommendationOpen(item.id)} className="flex min-h-[126px] flex-col justify-between rounded-[26px] border border-border bg-card p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,.4)] active:scale-[.99]"><span className="text-[9px] font-black uppercase tracking-[.14em] text-muted-foreground">{item.label}</span><span><span className="block font-display text-[22px] leading-none">{item.title}</span><span className="mt-2 block text-[11px] leading-snug text-muted-foreground">{item.detail}</span></span></a>)}</div> : null}
    </section> : null}

'''
t = replace_once(t, marker, insert, "home recommendation surface")
t = replace_once(
    t,
    '<div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">SG4</p><h2 className="mt-1 font-display text-3xl">Välj aktivitet</h2></div></div>',
    '<div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Utforska</p><h2 className="mt-1 font-display text-3xl">Allt i SG4</h2></div></div>',
    "home explore heading",
)
p.write_text(t)


# Play menu: teach the fun model which match formats are actually chosen.
p = Path("src/routes/spela.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { Bot, ChevronRight, Flag, Swords, Target, Trophy, Users } from "lucide-react";\n',
    'import { Bot, ChevronRight, Flag, Swords, Target, Trophy, Users } from "lucide-react";\nimport { useEffect } from "react";\nimport { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
    "play imports",
)
t = replace_once(
    t,
    'function PlayPage() {\n  return (',
    'function PlayPage() {\n  useEffect(() => { recordRecommendationImpressions(["play-bot", "play-friend", "play-team"]); }, []);\n  return (',
    "play impressions",
)
t = replace_once(t, '<Link to="/match-bot" className=', '<Link to="/match-bot" onClick={() => recordRecommendationOpen("play-bot")} className=', "play bot open")
t = replace_once(t, '<a href="/match?flow=friend" className=', '<a href="/match?flow=friend" onClick={() => recordRecommendationOpen("play-friend")} className=', "play friend open")
t = replace_once(t, '<a href="/match?flow=team" className=', '<a href="/match?flow=team" onClick={() => recordRecommendationOpen("play-team")} className=', "play team open")
p.write_text(t)


# Friend/team match: completion + replay feedback and a silent next-action card.
p = Path("src/routes/match.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance } from "@/lib/sg4-engine";\n',
    'import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance, type EngineSkill } from "@/lib/sg4-engine";\nimport { getRecommendationsForSkill } from "@/lib/sg4-surface-recommendations";\nimport { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
    "match recommendation imports",
)
t = replace_once(
    t,
    'function holeDistance(hole?: Hole) {\n  const value = Number.parseFloat(hole?.challenge.title ?? "");\n  return Number.isFinite(value) ? value : undefined;\n}\n',
    'function holeDistance(hole?: Hole) {\n  const value = Number.parseFloat(hole?.challenge.title ?? "");\n  return Number.isFinite(value) ? value : undefined;\n}\nfunction engineSkillForMatchCategory(category: MatchCategory | null): EngineSkill | null {\n  if (category === "putting") return "putting";\n  if (category === "around-the-green") return "chip";\n  if (category === "approach") return "approach";\n  if (category === "off-the-tee") return "driver";\n  return null;\n}\n',
    "match skill helper",
)
t = replace_once(
    t,
    '  const selectedCategory = CATEGORIES.find((i) => i.id === category);\n  const selectedType = category ? MATCH_TYPES[category].find((i) => i.id === matchType) : null;\n',
    '  const selectedCategory = CATEGORIES.find((i) => i.id === category);\n  const selectedType = category ? MATCH_TYPES[category].find((i) => i.id === matchType) : null;\n  const resultEngineSkill = engineSkillForMatchCategory(category);\n  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;\n  const playActivityId = mode === "singles" ? "play-friend" : mode ? "play-team" : null;\n  useEffect(() => {\n    if (step !== "result") return;\n    if (playActivityId) recordRecommendationCompletion(playActivityId);\n    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);\n  }, [step, playActivityId, resultRecommendation?.id]);\n',
    "match result feedback",
)
t = replace_once(
    t,
    '<section className="mt-5 space-y-3"><button onClick={rematch} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch</button>',
    '{resultRecommendation ? <a href={resultRecommendation.href} onClick={() => recordRecommendationOpen(resultRecommendation.id)} className={`mt-5 flex items-center gap-4 rounded-[26px] border p-4 text-left ${glass}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Nästa</span><span className="mt-1 block font-display text-2xl text-slate-950">{resultRecommendation.title}</span><span className="mt-1 block text-xs text-slate-600">{resultRecommendation.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></a> : null}<section className="mt-5 space-y-3"><button onClick={() => { if (playActivityId) recordRecommendationOpen(playActivityId); rematch(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch</button>',
    "match smart next card",
)
p.write_text(t)


# Bot match: same feedback loop, with bot-match preference feeding the home surface.
p = Path("src/routes/match-bot.tsx")
t = p.read_text()
t = replace_once(
    t,
    'import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance } from "@/lib/sg4-engine";\n',
    'import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance, type EngineSkill } from "@/lib/sg4-engine";\nimport { getRecommendationsForSkill } from "@/lib/sg4-surface-recommendations";\nimport { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";\n',
    "bot recommendation imports",
)
t = replace_once(
    t,
    'function randomLine(lines: string[]) { return lines[rand(0, lines.length - 1)] ?? ""; }\n',
    'function randomLine(lines: string[]) { return lines[rand(0, lines.length - 1)] ?? ""; }\nfunction engineSkillForBotCategory(category: Category | null): EngineSkill | null {\n  if (category === "putting") return "putting";\n  if (category === "around-the-green") return "chip";\n  if (category === "approach") return "approach";\n  if (category === "off-the-tee") return "driver";\n  return null;\n}\n',
    "bot skill helper",
)
t = replace_once(
    t,
    '  const current = holes[holeIndex];\n  const playerName = displayName ?? "Du";\n',
    '  const current = holes[holeIndex];\n  const playerName = displayName ?? "Du";\n  const resultEngineSkill = engineSkillForBotCategory(category);\n  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;\n  useEffect(() => {\n    if (step !== "result") return;\n    recordRecommendationCompletion("play-bot");\n    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);\n  }, [step, resultRecommendation?.id]);\n',
    "bot result feedback",
)
t = replace_once(
    t,
    '<div className="mt-5 space-y-3"><button onClick={buildHoles} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button>',
    '{resultRecommendation ? <a href={resultRecommendation.href} onClick={() => recordRecommendationOpen(resultRecommendation.id)} className={`mt-5 flex items-center gap-4 rounded-[26px] border p-4 text-left ${glass}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Nästa</span><span className="mt-1 block font-display text-2xl">{resultRecommendation.title}</span><span className="mt-1 block text-xs text-slate-600">{resultRecommendation.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></a> : null}<div className="mt-5 space-y-3"><button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button>',
    "bot smart next card",
)
p.write_text(t)
