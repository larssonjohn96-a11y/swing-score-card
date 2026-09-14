from pathlib import Path
import re

p = Path('src/routes/match.tsx')
s = p.read_text()

s = s.replace('import { useEffect, useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";')
import_anchor = 'import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance, type EngineSkill } from "@/lib/sg4-engine";\n'
extra_import = 'import { allowedDistancesInsideBand, getFriendHeadToHead, getFriendMatchPacing, getPlannedDistanceBand, recordFriendMatchHistory } from "@/lib/friend-match-experience";\n'
if extra_import not in s:
    if import_anchor not in s: raise SystemExit('import anchor missing')
    s = s.replace(import_anchor, import_anchor + extra_import, 1)

state_anchor = '  const [normalWinnerCelebration, setNormalWinnerCelebration] = useState<"blue" | "red" | null>(null);\n'
state_add = '''  const [normalWinnerCelebration, setNormalWinnerCelebration] = useState<"blue" | "red" | null>(null);
  const [matchRunId, setMatchRunId] = useState(() => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [headToHead, setHeadToHead] = useState({ played: 0, wins: 0, losses: 0, ties: 0 });
  const recordedHistoryIdRef = useRef<string | null>(null);
'''
if state_anchor in s:
    s = s.replace(state_anchor, state_add, 1)
elif 'const [matchRunId' not in s:
    raise SystemExit('state anchor missing')

pace_anchor = '  const tight = compact && Boolean(pressureNotice);\n'
pace_add = '''  const tight = compact && Boolean(pressureNotice);
  const matchPacing = getFriendMatchPacing(matchLength);
  const friendOpponent = entryFlow === "friend" ? redTeam[0] ?? selectedOthers[0] ?? null : null;
  const selfHistoryKey = user?.id ?? `self:${selfName.toLowerCase()}`;
  const opponentHistoryKey = friendOpponent?.id ?? (friendOpponent ? `guest:${friendOpponent.name.toLowerCase()}` : "");
  const resolvedResultWinner: "blue" | "red" | "tie" = resultLeader
    ?? (finalText.startsWith(blueLabel) ? "blue" : finalText.startsWith(redLabel) ? "red" : "tie");
'''
if pace_anchor in s:
    s = s.replace(pace_anchor, pace_add, 1)
elif 'const matchPacing =' not in s:
    raise SystemExit('pace anchor missing')

start_anchor = '  function startMatch() {\n    if (!mode || !teamsReady || !category || !matchType) return;\n'
start_repl = '''  function startMatch() {
    if (!mode || !teamsReady || !category || !matchType) return;
    const nextRunId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMatchRunId(nextRunId);
    recordedHistoryIdRef.current = null;
'''
if start_anchor in s:
    s = s.replace(start_anchor, start_repl, 1)
elif 'const nextRunId =' not in s:
    raise SystemExit('start anchor missing')

s = s.replace('window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, 380);', 'window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);')
s = s.replace('window.setTimeout(() => { advance(next); setApproachTurn("blue"); resetApproachInput(nextTargetDistance); setTransitionMessage(null); setIsSubmitting(false); }, 380);', 'window.setTimeout(() => { advance(next); setApproachTurn("blue"); resetApproachInput(nextTargetDistance); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);')
s = s.replace('window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, 2300);', 'window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, matchPacing.resultCelebrationMs);')

s = s.replace('      if (isShortGame) {\n        const delta = s.bluePoints - s.redPoints;', '      if (isShortGameScoring) {\n        const delta = s.bluePoints - s.redPoints;')
s = s.replace('      const strokeWinner = isShortGame ? (s.bluePoints > s.redPoints ? "blue" : "red") : (s.blueStrokes < s.redStrokes ? "blue" : "red");', '      const strokeWinner = isShortGameScoring ? (s.bluePoints > s.redPoints ? "blue" : "red") : (s.blueStrokes < s.redStrokes ? "blue" : "red");')

m = re.search(r'  function adaptNextChallenge\(next: Hole\[\], registered: number, performance: number\) \{.*?\n  \}\n  function recordPutting\(\)', s, re.S)
if m:
    replacement = '''  function adaptNextChallenge(next: Hole[], registered: number, performance: number) {
    if (!category || !mode || registered >= next.length - 1) return next;
    if (category !== "putting" && category !== "around-the-green") return next;
    const currentDistance = holeDistance(next[registered]);
    const plannedNextDistance = holeDistance(next[registered + 1]);
    if (typeof currentDistance !== "number" || typeof plannedNextDistance !== "number") return next;
    const skill = category === "putting" ? "putting" : "chip";
    const band = getPlannedDistanceBand(skill, plannedNextDistance);
    const allowedDistances = allowedDistancesInsideBand(skill, plannedNextDistance, currentDistance);
    const nextDistance = selectNextEngineDistance({
      skill,
      objective: "balanced",
      context: "game",
      min: band.min,
      max: band.max,
      previousDistance: currentDistance,
      previousPerformance: performance,
      allowedDistances,
    });
    const nextIndex = registered + 1;
    const adapted = [...next];
    adapted[nextIndex] = {
      ...adapted[nextIndex],
      challenge: generateChallenge(category, matchType ?? "closest", mode, shortGameLies, nextDistance),
    };
    return adapted;
  }
  function recordPutting()'''
    s = s[:m.start()] + replacement + s[m.end():]
elif 'plannedNextDistance' not in s:
    raise SystemExit('adapt function not found')

old_restore = '      setHoles(Array.isArray(saved.holes) ? saved.holes : []);\n      setHoleIndex(Number.isFinite(saved.holeIndex) ? saved.holeIndex : 0);'
new_restore = '''      const restoredHoles = Array.isArray(saved.holes) ? saved.holes.slice(0, saved.matchLength ?? 5) : [];
      if (!restoredHoles.length || !restoredHoles.every((hole: any) => hole && hole.challenge && typeof hole.challenge.title === "string")) {
        window.localStorage.removeItem(LOCAL_MATCH_KEY);
        setLocalMatchReady(true);
        return;
      }
      setHoles(restoredHoles);
      setHoleIndex(Math.min(Math.max(0, Number.isFinite(saved.holeIndex) ? saved.holeIndex : 0), restoredHoles.length - 1));'''
if old_restore in s:
    s = s.replace(old_restore, new_restore, 1)
elif 'const restoredHoles' not in s:
    raise SystemExit('restore anchor missing')

if 'if (saved.matchRunId) setMatchRunId(saved.matchRunId);' not in s:
    s = s.replace('      if (saved.selfName) setSelfName(saved.selfName);', '      if (saved.selfName) setSelfName(saved.selfName);\n      if (saved.matchRunId) setMatchRunId(saved.matchRunId);')
if 'selfName, matchRunId,' not in s:
    s = s.replace('      selectedFriendIds, guests, blueMateId, selfName,', '      selectedFriendIds, guests, blueMateId, selfName, matchRunId,')
if 'blueMateId, selfName, matchRunId, blueLabel, redLabel]);' not in s:
    s = s.replace('blueMateId, selfName, blueLabel, redLabel]);', 'blueMateId, selfName, matchRunId, blueLabel, redLabel]);')

history_effect = '''  useEffect(() => {
    if (step !== "result" || entryFlow !== "friend" || !friendOpponent || !category || score.played <= 0) return;
    const historyId = matchSessionId ? `cloud:${matchSessionId}` : matchRunId;
    if (recordedHistoryIdRef.current === historyId) return;
    recordedHistoryIdRef.current = historyId;
    recordFriendMatchHistory({
      id: historyId,
      playedAt: new Date().toISOString(),
      selfKey: selfHistoryKey,
      opponentKey: opponentHistoryKey,
      selfName,
      opponentName: friendOpponent.name,
      category,
      length: matchLength,
      winner: resolvedResultWinner,
      finalText,
    });
    setHeadToHead(getFriendHeadToHead(selfHistoryKey, opponentHistoryKey));
  }, [step, entryFlow, friendOpponent?.id, friendOpponent?.name, category, score.played, matchSessionId, matchRunId, selfHistoryKey, opponentHistoryKey, selfName, matchLength, resolvedResultWinner, finalText]);

'''
if 'recordFriendMatchHistory({' not in s:
    anchor = '  function rematch() {\n    startMatch();\n  }\n'
    if anchor not in s: raise SystemExit('rematch anchor missing')
    s = s.replace(anchor, history_effect + anchor, 1)

if 'headToHead.played > 0' not in s:
    result_pos = s.find('{step === "result" ? <>')
    if result_pos < 0: raise SystemExit('result block missing')
    patterns = ['<div className="mt-5 grid grid-cols-2 gap-3">','<div className="mt-5 grid grid-cols-2 gap-2">','<div className="mt-6 grid grid-cols-2 gap-3">']
    for pattern in patterns:
        pos = s.find(pattern, result_pos)
        if pos >= 0:
            h2h = '''{entryFlow === "friend" && friendOpponent && headToHead.played > 0 ? <div className="mt-3 rounded-[20px] border border-slate-200/90 bg-white/72 px-4 py-3 text-center shadow-sm backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Inbördes</p><p className="mt-1 font-display text-xl text-slate-950">{headToHead.wins}–{headToHead.losses}{headToHead.ties ? ` · ${headToHead.ties} lika` : ""}</p><p className="mt-0.5 text-[10px] text-slate-500">{selfName} mot {friendOpponent.name} · {headToHead.played} matcher</p></div> : null}
    '''
            s = s[:pos] + h2h + s[pos:]
            break
    else:
        raise SystemExit('result action grid missing')

p.write_text(s)
