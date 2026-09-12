from pathlib import Path

match_path = Path('src/routes/match.tsx')
s = match_path.read_text()

# Imports for cloud match state.
anchor = 'import { LIGHT_SURFACE } from "./8-bollar";'
insert = '''import { LIGHT_SURFACE } from "./8-bollar";
import {
  createMatchMultiplayerSession,
  fetchMatchMultiplayerSession,
  subscribeMatchMultiplayerSession,
  updateMatchMultiplayerState,
  type MatchCloudState,
} from "@/lib/match-multiplayer";'''
if anchor not in s:
    raise SystemExit('match import anchor not found')
s = s.replace(anchor, insert, 1)

# Session state.
anchor = '  const [returnHoleIndex, setReturnHoleIndex] = useState<number | null>(null);'
insert = '''  const [returnHoleIndex, setReturnHoleIndex] = useState<number | null>(null);
  const [matchSessionId, setMatchSessionId] = useState<string | null>(null);
  const [matchSessionHostId, setMatchSessionHostId] = useState<string | null>(null);
  const [sessionBlueTeam, setSessionBlueTeam] = useState<Player[] | null>(null);
  const [sessionRedTeam, setSessionRedTeam] = useState<Player[] | null>(null);'''
if anchor not in s:
    raise SystemExit('match session state anchor not found')
s = s.replace(anchor, insert, 1)

# Restore a live match when any participant opens the banner link.
anchor = '''  }, [user, loading]);

  const selfPlayer: Player ='''
insert = '''  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const sessionId = new URLSearchParams(window.location.search).get("session");
    if (!sessionId) return;
    let cancelled = false;

    const applySession = async () => {
      try {
        const session = await fetchMatchMultiplayerSession(sessionId);
        if (cancelled || !session?.state) return;
        const state = session.state;
        setMatchSessionId(session.id);
        setMatchSessionHostId(session.hostUserId);
        setSessionBlueTeam(state.blueTeam as Player[]);
        setSessionRedTeam(state.redTeam as Player[]);
        setMode(state.mode);
        setCategory(state.category);
        setMatchType(state.matchType);
        setScoringMode(state.scoringMode);
        setMatchLength(state.matchLength);
        setHoles(state.holes as Hole[]);
        setHoleIndex(Math.min(state.holeIndex, Math.max(0, state.matchLength - 1)));
        setFinalText(state.finalText ?? "");
        setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null);
        setApproachTurn("blue");
        setStep(session.status === "completed" || Boolean(state.finalText) ? "result" : "play");
      } catch {
        // If a stale session link cannot be loaded, keep the normal match flow available.
      }
    };

    void applySession();
    const unsubscribe = subscribeMatchMultiplayerSession(sessionId, () => { void applySession(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  const selfPlayer: Player ='''
if anchor not in s:
    raise SystemExit('session restore anchor not found')
s = s.replace(anchor, insert, 1)

# Use stable team snapshots when re-entering from another participant's phone.
s = s.replace(
    '  const blueTeam = mode === "singles" ? [selfPlayer] : [selfPlayer, ...(blueMate ? [blueMate] : [])];\n  const redTeam = selectedPlayers.filter((p) => !blueTeam.some((b) => b.id === p.id));',
    '  const blueTeam = sessionBlueTeam ?? (mode === "singles" ? [selfPlayer] : [selfPlayer, ...(blueMate ? [blueMate] : [])]);\n  const redTeam = sessionRedTeam ?? selectedPlayers.filter((p) => !blueTeam.some((b) => b.id === p.id));',
    1,
)

# Result summary helpers.
anchor = '  const topScoreMeta = scoringMode === "match"\n    ? `Hål ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`\n    : category === "around-the-green" ? "Poäng" : "Slag";'
insert = '''  const topScoreMeta = scoringMode === "match"
    ? `Hål ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`
    : category === "around-the-green" ? "Poäng" : "Slag";
  const resultLeader = scoringMode === "match"
    ? matchLeader
    : category === "around-the-green"
      ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
      : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const resultScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : holesRemaining > 0 ? `${Math.abs(diff)}&${holesRemaining}` : `${Math.abs(diff)} UP`
    : category === "around-the-green"
      ? `${score.bluePoints}–${score.redPoints}`
      : `${score.blueStrokes}–${score.redStrokes}`;
  const tiedHoles = Math.max(0, score.played - score.blue - score.red);'''
if anchor not in s:
    raise SystemExit('result helper anchor not found')
s = s.replace(anchor, insert, 1)

# Cloud state builder and host sync.
anchor = '  const selectedGlass = "border-blue-300/70 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/55 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.38)] ring-2 ring-blue-500/30 backdrop-blur-2xl";'
insert = '''  const selectedGlass = "border-blue-300/70 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/55 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.38)] ring-2 ring-blue-500/30 backdrop-blur-2xl";

  function makeCloudState(nextHoles = holes, nextHoleIndex = holeIndex, nextFinalText = finalText): MatchCloudState | null {
    if (!mode || !category || !matchType) return null;
    return {
      mode,
      category,
      categoryTitle: selectedCategory?.title ?? category,
      matchType,
      scoringMode,
      matchLength,
      holes: nextHoles,
      holeIndex: nextHoleIndex,
      finalText: nextFinalText,
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
    };
  }

  useEffect(() => {
    if (!matchSessionId || !user || matchSessionHostId !== user.id || (step !== "play" && step !== "result")) return;
    const state = makeCloudState();
    if (!state) return;
    const timer = window.setTimeout(() => {
      void updateMatchMultiplayerState(
        matchSessionId,
        state,
        Math.min(score.played, matchLength),
        step === "result" ? "completed" : "active",
      ).catch(() => undefined);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [matchSessionId, matchSessionHostId, user?.id, step, holes, holeIndex, finalText, mode, category, matchType, scoringMode, matchLength, blueLabel, redLabel, score.played]);'''
if anchor not in s:
    raise SystemExit('cloud state anchor not found')
s = s.replace(anchor, insert, 1)

# Create a shared live match session for signed-in friends when the match starts.
anchor = '    setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("play");\n  }'
insert = '''    setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("play");
    setSessionBlueTeam(null); setSessionRedTeam(null);

    if (user && selectedOthers.length > 0 && selectedOthers.every((player) => !player.isGuest)) {
      const state: MatchCloudState = {
        mode,
        category,
        categoryTitle: selectedCategory?.title ?? category,
        matchType,
        scoringMode,
        matchLength,
        holes: nextHoles,
        holeIndex: 0,
        finalText: "",
        blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
        redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      };
      void createMatchMultiplayerSession(
        selectedOthers.map((player) => ({ id: player.id, displayName: player.name })),
        state,
      ).then((id) => {
        setMatchSessionId(id);
        setMatchSessionHostId(user.id);
        window.history.replaceState(window.history.state, "", `/match?session=${id}`);
      }).catch(() => undefined);
    }
  }'''
if anchor not in s:
    raise SystemExit('start match anchor not found')
s = s.replace(anchor, insert, 1)

# Reset session identity when starting a separate competition.
s = s.replace(
    '    setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("category");',
    '    setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", "/match"); setStep("category");',
    1,
)
s = s.replace(
    '    setScoringMode("match"); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setShortGameLies([]); setApproachRanges([]); setApproachCustomMin(30); setApproachCustomMax(200); setApproachTurn("blue"); resetApproachInput(); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("players");',
    '    setScoringMode("match"); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setShortGameLies([]); setApproachRanges([]); setApproachCustomMin(30); setApproachCustomMax(200); setApproachTurn("blue"); resetApproachInput(); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", "/match"); setStep("players");',
    1,
)

# PGA Tour match defaults to the quick 5-hole option, not 9.
s = s.replace('if (i.id === "pga-tour") setMatchLength(9);', 'if (i.id === "pga-tour") setMatchLength(5);', 1)

# Match-length cards: number + "hål" on one line, format descriptor below.
old = '''<span className="block font-display text-4xl">{v}</span><span className="text-[10px] font-bold uppercase">{isPgaPutting ? (v === 5 ? "hål · snabb" : v === 9 ? "hål · halv match" : "hål · full match") : "hål"}</span>'''
new = '''<span className="block whitespace-nowrap font-display text-3xl leading-none">{v} <span className="text-xl">hål</span></span><span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{isPgaPutting ? (v === 5 ? "Snabb" : v === 9 ? "Halv match" : "Full match") : v === 5 ? "Snabb" : v === 9 ? "Halv match" : "Full match"}</span>'''
if old not in s:
    raise SystemExit('length card anchor not found')
s = s.replace(old, new, 1)

# Pressure state: roll in first, then pulse the whole yellow card edge rather than the label.
s = s.replace(
    '@keyframes sg4PressureRoll{from{clip-path:inset(0 100% 0 0);opacity:.4}to{clip-path:inset(0 0 0 0);opacity:1}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1)}8%{transform:scale(1.04)}16%{transform:scale(1)}24%{transform:scale(1.025)}36%{transform:scale(1)}}',
    '@keyframes sg4PressureRoll{from{clip-path:inset(0 100% 0 0);opacity:.4}to{clip-path:inset(0 0 0 0);opacity:1}}@keyframes sg4PressurePulse{0%,100%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}12%{box-shadow:0 12px 28px -18px rgba(245,158,11,.72),0 0 0 3px rgba(250,204,21,.55)}22%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 1px rgba(250,204,21,.15)}32%{box-shadow:0 12px 28px -18px rgba(245,158,11,.68),0 0 0 2px rgba(250,204,21,.38)}44%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}}',
    1,
)
s = s.replace(
    'style={{ animation: "sg4PressureRoll 460ms cubic-bezier(.22,.8,.3,1) both" }}><div className="flex items-center gap-2"><div className="shrink-0" style={{ animation: "sg4PressurePulse 1.7s ease-in-out 460ms infinite" }}>',
    'style={{ animation: "sg4PressureRoll 460ms cubic-bezier(.22,.8,.3,1) both, sg4PressurePulse 1.7s ease-in-out 460ms infinite" }}><div className="flex items-center gap-2"><div className="shrink-0">',
    1,
)

# Replace result hero with Ryder-Cup style scoreboard; keep full scorecard below.
start = s.find('{step === "result" ? <><section className="mt-7 rounded-[34px]')
scorecard = s.find('<section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p>', start)
if start == -1 or scorecard == -1:
    raise SystemExit('result hero anchors not found')
hero = '''{step === "result" ? <><section className="mt-6 overflow-hidden rounded-[28px] border border-slate-300/85 bg-white/90 shadow-[0_22px_52px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl"><div className="px-4 pt-4 text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title} · Matchresultat</p></div><div className="mt-3 grid min-h-[104px] grid-cols-[1fr_88px_1fr] items-stretch"><div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pr-6 ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{blueLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "blue" ? "text-white" : "text-blue-700"}`}>{scoringMode === "match" ? score.blue : isShortGame ? score.bluePoints : score.blueStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "blue" ? "text-blue-100" : "text-slate-500"}`}>{scoringMode === "match" ? "vunna hål" : isShortGame ? "poäng" : "slag"}</p></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><Trophy className="mb-1 h-4 w-4 text-amber-500" /><p className="font-display text-[26px] leading-none text-slate-950">{resultScoreText}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Slutresultat</p></div><div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pl-6 text-right ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{redLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "red" ? "text-white" : "text-red-700"}`}>{scoringMode === "match" ? score.red : isShortGame ? score.redPoints : score.redStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "red" ? "text-red-100" : "text-slate-500"}`}>{scoringMode === "match" ? "vunna hål" : isShortGame ? "poäng" : "slag"}</p></div></div><div className="border-t border-slate-200 px-4 py-3 text-center"><p className="text-xs font-bold text-slate-800">{finalText}</p>{scoringMode === "match" ? <p className="mt-1 text-[10px] font-semibold text-slate-500">{blueLabel} vann {score.blue} hål · {redLabel} vann {score.red} hål{tiedHoles ? ` · ${tiedHoles} delade` : ""}</p> : null}</div></section>'''
s = s[:start] + hero + s[scorecard:]

match_path.write_text(s)

# Mount persistent active-game banner at app root.
root_path = Path('src/routes/__root.tsx')
r = root_path.read_text()
anchor = 'import { startSessionSync } from "@/lib/sessions/startup";'
if anchor not in r:
    raise SystemExit('root import anchor not found')
r = r.replace(anchor, anchor + '\nimport { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";', 1)
old = '<QueryClientProvider client={queryClient}><SubscriptionProvider><BottomNavVisibilityProvider><div className="relative min-h-screen pb-20"><Outlet /><BottomNav /><DevPlanSwitcher /></div>{show && <SplashScreen onDismiss={dismiss} />}</BottomNavVisibilityProvider></SubscriptionProvider></QueryClientProvider>'
new = '<QueryClientProvider client={queryClient}><SubscriptionProvider><BottomNavVisibilityProvider><div className="relative min-h-screen pb-20"><Outlet /><ActiveMultiplayerBanner /><BottomNav /><DevPlanSwitcher /></div>{show && <SplashScreen onDismiss={dismiss} />}</BottomNavVisibilityProvider></SubscriptionProvider></QueryClientProvider>'
if old not in r:
    raise SystemExit('root jsx anchor not found')
r = r.replace(old, new, 1)
root_path.write_text(r)
