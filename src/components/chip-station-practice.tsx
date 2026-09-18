import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Check, ChevronRight, Flag, LockKeyhole, RotateCcw, Target, Trophy, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  CHIP_STATIONS, CHIP_ZONES, ROUNDS_PER_PASS, bestAt, chipStorageKey, emptyChipProgress,
  goalAt, masteryAt, parseChipProgress, recentAt, recommendStation, reduceChipProgress, roundTotal,
  sessionRounds, unlockedDistances, type ChipAction, type ChipLie, type ChipPoints, type ChipProgress,
} from '@/lib/chip-stations';

type Props = { userId: string | null; authLoading?: boolean; coach: { name: string; emoji: string }; surface?: CSSProperties; onExit: () => void };
const card = 'rounded-[24px] border border-slate-200/80 bg-white/90 shadow-[0_12px_36px_-24px_rgba(15,23,42,.25)] backdrop-blur-xl';
const primary = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition active:scale-[.99] disabled:opacity-35';
const secondary = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition active:scale-[.99]';
const uniqueId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `chip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const format = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: 1 });

export function ChipStationPractice({ userId, authLoading = false, coach, surface, onExit }: Props) {
  const [progress, setProgress] = useState<ChipProgress>(emptyChipProgress);
  const stateRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [lies, setLies] = useState<ChipLie[]>([]);
  const [selectedDistance, setSelectedDistance] = useState(8);
  const [selectedLie, setSelectedLie] = useState<ChipLie>('Fairway');
  const [endDialog, setEndDialog] = useState(false);
  const [rulesDialog, setRulesDialog] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const tapUntil = useRef(0);
  const key = chipStorageKey(userId);

  useEffect(() => {
    if (authLoading) return;
    let stored = emptyChipProgress();
    try { stored = parseChipProgress(window.localStorage.getItem(key)); } catch { setStorageError(true); }
    stateRef.current = stored;
    setProgress(stored);
    if (stored.session) {
      setLies(stored.session.lies);
      setSelectedLie(stored.session.current?.lie ?? stored.session.lies[0]);
      setSelectedDistance(stored.session.current?.distance ?? recommendStation(stored).distance);
      setResumePrompt(stored.session.phase === 'play' && !!stored.session.current?.shots.length);
    }
    setReady(true);
  }, [key, authLoading]);

  function commit(action: ChipAction) {
    if (!ready) return;
    const next = reduceChipProgress(stateRef.current, action);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setProgress(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  }
  function startPass() {
    const available = lies.length ? lies : progress.session?.lies ?? [];
    if (!available.length) return;
    commit({ type: 'start', id: uniqueId(), lies: available, at: Date.now() });
    setSelectedDistance(8);
    setSelectedLie(available[0]);
    setResumePrompt(false);
  }
  function begin(distance: number) {
    const available = stateRef.current.session?.lies ?? [];
    if (!available.length) return;
    const lie = available.includes(selectedLie) ? selectedLie : available[0];
    commit({ type: 'begin', distance, lie, id: uniqueId(), at: Date.now() });
    setSelectedDistance(distance);
    setResumePrompt(false);
    tapUntil.current = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function score(points: ChipPoints) {
    if (Date.now() < tapUntil.current) return;
    tapUntil.current = Date.now() + 300;
    commit({ type: 'score', points });
  }
  function chooseStation() {
    setSelectedDistance(recommendStation(stateRef.current).distance);
    commit({ type: 'stations' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function finish() {
    commit({ type: 'finish' });
    setEndDialog(false);
    setResumePrompt(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const session = progress.session;
  const phase = session?.phase ?? 'setup';
  const current = session?.current;
  const rounds = sessionRounds(progress);
  const unlocked = unlockedDistances(progress);
  const recommendation = recommendStation(progress);
  const distance = current?.distance ?? selectedDistance;
  const total = current ? roundTotal(current) : 0;
  const beforeRound = current ? { ...progress, rounds: progress.rounds.filter(r => r.id !== current.id) } : progress;
  const goal = goalAt(phase === 'result' ? beforeRound : progress, distance);
  const lastBest = bestAt(beforeRound, distance);
  const newPb = phase === 'result' && (lastBest === null || total > lastBest);
  const badge = masteryAt(distance, total);
  const priorBadge = masteryAt(distance, lastBest);
  const newBadge = phase === 'result' && !!badge && badge !== priorBadge && newPb;
  const justUnlocked = phase === 'result' ? unlocked.filter(d => !unlockedDistances(beforeRound).includes(d)) : [];
  const passCheckpoint = rounds.length > 0 && rounds.length % ROUNDS_PER_PASS === 0;
  const cycle = Math.floor(Math.max(0, rounds.length - (phase === 'result' ? 1 : 0)) / ROUNDS_PER_PASS);
  const passRound = rounds.length - cycle * ROUNDS_PER_PASS + (phase === 'play' ? 1 : 0);
  const sessionTotal = rounds.reduce((sum, r) => sum + roundTotal(r), 0);
  const sessionShots = rounds.flatMap(r => r.shots);
  const playedDistances = CHIP_STATIONS.filter(s => rounds.some(r => r.distance === s.distance));
  const coachText = phase === 'setup'
    ? 'Tre bollar från samma station. Du får poäng, jag föreslår nästa steg. Vilket underlag kan du träna från?'
    : phase === 'stations'
      ? 'Börja kort eller välj en upplåst station. Kortare avstånd finns alltid kvar att förbättra.'
      : phase === 'play'
        ? 'Slå alla tre från samma plats och underlag. Registrera varje bolls avstånd till hålet.'
        : phase === 'result'
          ? justUnlocked.length ? `${justUnlocked[0]} meter är upplåst. Gå vidare eller jaga nästa medalj här.` : recommendation.reason
          : 'Passet är avslutat. Här är dina faktiska resultat – nästa pass börjar med ett tydligt mål.';

  function back() {
    if (phase === 'setup' || phase === 'summary' || (!rounds.length && !current?.shots.length)) onExit();
    else setEndDialog(true);
  }

  return <main data-chip-stations="v1" style={{ ...surface, colorScheme: 'light' }} className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
    <header className="flex min-h-14 items-center justify-between gap-3">
      <button type="button" onClick={back} aria-label="Tillbaka" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white"><ArrowLeft className="h-5 w-5" /></button>
      <div className="min-w-0 text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Practice Mode</p><h1 className="text-lg font-black">Chippning</h1></div>
      {session && phase !== 'summary' ? <button type="button" onClick={() => setEndDialog(true)} className="min-h-11 text-xs font-bold text-slate-600">Avsluta</button> : <span className="w-11" />}
    </header>
    {!ready ? <p role="status" className="py-12 text-center text-sm text-slate-500">Laddar dina stationer…</p> : <>
      {storageError ? <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Resultaten finns kvar i passet men kunde inte sparas på enheten. Lämna inte sidan innan lagringen fungerar igen.</p> : null}
      <section aria-label={`${coach.name}, din coach`} className={`${card} mt-4 flex min-h-[96px] items-center gap-3 px-4 py-3`}>
        <span aria-hidden="true" className="shrink-0 text-[42px] leading-none">{coach.emoji}</span>
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-blue-600">{coach.name}</p><p className="mt-1 text-[13px] font-medium leading-5 text-slate-700">{coachText}</p></div>
      </section>

      {phase === 'setup' ? <section className="mt-6">
        <h2 className="text-2xl font-black">Välj underlag</h2><p className="mt-2 text-sm text-slate-500">Välj ett eller båda. Underlaget byts inte mitt i en runda.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">{(['Fairway', 'Ruff'] as ChipLie[]).map(lie => <button type="button" key={lie} aria-pressed={lies.includes(lie)} onClick={() => setLies(old => old.includes(lie) ? old.filter(l => l !== lie) : [...old, lie])} className={`${card} flex min-h-24 items-center justify-center gap-2 text-lg font-bold ${lies.includes(lie) ? '!border-blue-500 !bg-blue-50 text-blue-700 ring-2 ring-blue-100' : ''}`}>{lies.includes(lie) ? <Check className="h-5 w-5" /> : null}{lie}</button>)}</div>
        <div className={`${card} my-5 flex items-center gap-3 p-4`}><Target className="h-6 w-6 text-blue-600" /><div><p className="text-sm font-bold">5 rundor · 15 chippar</p><p className="mt-1 text-xs text-slate-500">Tre bollar → poäng → nästa mål.</p></div></div>
        <button type="button" disabled={!lies.length} onClick={startPass} className={primary}>Välj station <ChevronRight className="h-5 w-5" /></button>
      </section> : null}

      {phase === 'stations' ? <section className="mt-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Dina stationer</h2><button type="button" onClick={() => setRulesDialog(true)} className="min-h-11 text-xs font-bold text-blue-600">Poäng & nivåer</button></div>
        <p className="mb-4 text-xs leading-5 text-slate-500">Varje försök: 3 bollar, max 12 poäng. Medaljen visar ditt bästa försök på avståndet.</p>
        <div className="grid grid-cols-2 gap-3">{CHIP_STATIONS.map((config, index) => {
          const open = unlocked.includes(config.distance);
          const best = bestAt(progress, config.distance);
          const tier = masteryAt(config.distance, best);
          const recent = recentAt(progress, config.distance);
          const selected = selectedDistance === config.distance;
          const predecessor = CHIP_STATIONS[index - 1];
          return <button type="button" key={config.distance} disabled={!open} onClick={() => setSelectedDistance(config.distance)} aria-pressed={selected && open} className={`${card} relative min-h-[148px] p-4 text-left ${selected && open ? '!border-blue-500 !bg-blue-50 ring-2 ring-blue-100' : ''} ${!open ? '!bg-slate-100/70 text-slate-400' : ''}`}>
            <div className="flex items-center justify-between"><span className="text-[28px] font-black leading-none">{config.distance}<span className="ml-1 text-sm font-bold">m</span></span>{open ? selected ? <Check className="h-5 w-5 text-blue-600" /> : <Flag className="h-4 w-4 text-slate-400" /> : <LockKeyhole className="h-4 w-4" />}</div>
            {open ? <><p className="mt-3 text-sm font-bold text-slate-800">{best === null ? 'Inte spelad' : `${best}/12 · ${tier ?? 'På väg'}`}</p><p className="mt-1 text-[11px] text-slate-500">{recent === null ? `${config.unlock} p för Bronze` : `Senaste snitt: ${format(recent)}/12`}</p>{config.distance === recommendation.distance ? <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-blue-600">Rekommenderad</p> : null}</> : <p className="mt-3 text-[11px] leading-4">Nå {predecessor.unlock} p på {predecessor.distance} m för att låsa upp.</p>}
          </button>;
        })}</div>
        {session && session.lies.length > 1 ? <div className="mt-4 flex items-center gap-2"><span className="mr-1 text-xs font-bold text-slate-500">Underlag</span>{session.lies.map(lie => <button type="button" key={lie} aria-pressed={selectedLie === lie} onClick={() => setSelectedLie(lie)} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${selectedLie === lie ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>{lie}</button>)}</div> : <p className="mt-4 text-xs font-bold text-slate-500">Underlag: {selectedLie}</p>}
        <div className={`${card} mb-3 mt-4 p-4`}><p className="text-xs font-bold text-blue-600">{goalAt(progress, selectedDistance).label}</p><p className="mt-1 text-lg font-black">Mål: {goalAt(progress, selectedDistance).points} av 12 poäng</p></div>
        <button type="button" onClick={() => begin(selectedDistance)} disabled={!unlocked.includes(selectedDistance)} className={primary}>Starta {selectedDistance} m · 3 bollar <ChevronRight className="h-5 w-5" /></button>
      </section> : null}

      {phase === 'play' && current ? <section className="mt-4">
        {resumePrompt ? <p role="status" className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Din pågående runda är återställd. Fortsätt med boll {current.shots.length + 1}.</p> : null}
        <div className={`${card} px-5 py-4`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500"><span>Runda {passRound}/{ROUNDS_PER_PASS}{cycle > 0 ? ` · del ${cycle + 1}` : ''}</span><span>{current.lie}</span></div>
          <div className="mt-2 flex items-end justify-between"><p className="text-[52px] font-black leading-none tracking-tight">{distance}<span className="ml-2 text-xl font-bold">m</span></p><p aria-live="polite" className="text-3xl font-black text-blue-600">{total}<span className="text-base text-slate-400">/12 p</span></p></div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs font-semibold text-slate-600">{goal.label}</p><p className="text-sm font-black">Mål {goal.points} p</p></div>
        </div>
        <div className="my-4 flex items-center justify-between gap-3"><h2 aria-live="polite" className="text-base font-black">Registrera boll {current.shots.length + 1} av 3</h2><div className="flex gap-2">{[0, 1, 2].map(i => <span key={i} aria-label={`Boll ${i + 1}: ${current.shots[i] === undefined ? 'kvar' : `${current.shots[i]} poäng`}`} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${current.shots[i] !== undefined ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-400'}`}>{current.shots[i] === undefined ? i + 1 : `${current.shots[i]}p`}</span>)}</div></div>
        <div className="grid grid-cols-2 gap-2.5">{CHIP_ZONES.map(zone => <button type="button" key={zone.points} onClick={() => score(zone.points)} aria-label={`${zone.label}, ${zone.points} poäng. ${zone.detail}`} className={`flex min-h-[60px] items-center justify-between gap-2 rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-900 transition active:scale-[.98] active:bg-blue-100 ${zone.points === 4 ? 'col-span-2 !border-blue-600 !bg-blue-600 !text-white' : ''}`}><span className="text-sm font-bold">{zone.label}</span><span className="text-xl font-black">{zone.points}<span className="ml-1 text-xs font-bold">p</span></span></button>)}</div>
        <div className="mt-3 flex items-center justify-between"><button type="button" disabled={!current.shots.length} onClick={() => commit({ type: 'undo' })} className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-slate-600 disabled:opacity-30"><Undo2 className="h-4 w-4" />Ångra senaste</button><button type="button" onClick={() => setRulesDialog(true)} className="min-h-11 text-xs font-bold text-blue-600">Poängzoner</button></div>
        {!current.shots.length ? <button type="button" onClick={chooseStation} className="min-h-11 w-full text-xs font-bold text-slate-500">Byt station innan du börjar</button> : null}
      </section> : null}

      {phase === 'result' && current ? <section className="mt-4">
        <div className={`${card} px-5 py-6 text-center`}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{distance} m · {current.lie} · 3 bollar</p>
          <div className="mt-3 text-[68px] font-black leading-none tracking-tight text-blue-600">{total}<span className="text-2xl text-slate-400">/12</span></div>
          <p role="status" className="mt-3 text-xl font-black">{total >= goal.points ? `${goal.label.startsWith('Lås upp') ? 'Stationsmålet' : goal.label.replace('Nå ', '')} klart ✓` : `${goal.points - total} poäng till målet`}</p>
          <div className="mt-3 flex justify-center gap-2">{current.shots.map((p, i) => <span key={i} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Boll {i + 1}: {p} p</span>)}</div>
          {newPb ? <p className="mt-4 text-sm font-bold text-blue-600">{lastBest === null ? 'Första resultatet sparat' : `Nytt personbästa · tidigare ${lastBest}/12`}</p> : <p className="mt-4 text-sm text-slate-500">Personbästa: {bestAt(progress, distance)}/12</p>}
          {newBadge ? <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700"><Trophy className="h-5 w-5" />{badge} på {distance} m</div> : null}
          {justUnlocked.length ? <p className="mt-3 text-sm font-black text-blue-600">Ny station: {justUnlocked[0]} m upplåst</p> : null}
        </div>
        {passCheckpoint ? <div className="my-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-black text-blue-800">Delmål klart · {ROUNDS_PER_PASS} rundor</p><p className="mt-1 text-xs text-blue-700">{rounds.length * 3} chippar registrerade i passet. Se resultatet eller träna vidare.</p></div> : <p className="my-4 text-center text-xs text-slate-500">{rounds.length % ROUNDS_PER_PASS} av {ROUNDS_PER_PASS} rundor till nästa passresultat</p>}
        <button type="button" onClick={() => passCheckpoint ? finish() : begin(recommendation.distance)} className={primary}>{passCheckpoint ? 'Se passresultat' : recommendation.distance === distance ? `Nästa runda · ${distance} m` : `Fortsätt till ${recommendation.distance} m`}<ChevronRight className="h-5 w-5" /></button>
        {!passCheckpoint ? <p className="mt-2 text-center text-[11px] text-slate-500">{goalAt(progress, recommendation.distance).label} · {goalAt(progress, recommendation.distance).points} p</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-3"><button type="button" onClick={() => begin(distance)} className={secondary}><RotateCcw className="h-4 w-4" />Försök igen</button><button type="button" onClick={chooseStation} className={secondary}>Välj station</button></div>
        <button type="button" onClick={() => commit({ type: 'undo' })} className="mt-2 min-h-11 w-full text-xs font-bold text-slate-500">Rätta senaste bollen</button>
      </section> : null}

      {phase === 'summary' ? <section className="mt-5">
        <div className={`${card} p-5 text-center`}><Trophy className="mx-auto h-8 w-8 text-blue-600" /><h2 className="mt-3 text-2xl font-black">Passet klart</h2><p className="mt-1 text-sm text-slate-500">{rounds.length} rundor · {sessionShots.length} chippar</p><div className="mt-5 grid grid-cols-3 gap-2"><div><p className="text-xl font-black text-blue-600">{sessionTotal}<span className="text-xs text-slate-400">/{rounds.length * 12}</span></p><p className="mt-1 text-[10px] font-bold text-slate-500">Poäng</p></div><div><p className="text-xl font-black">{sessionShots.filter(p => p >= 2).length}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Inom 2 m</p></div><div><p className="text-xl font-black">{sessionShots.filter(p => p === 4).length}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Sänkta</p></div></div></div>
        {playedDistances.length ? <div className={`${card} mt-4 overflow-hidden`}><p className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-500">Station · bästa i passet · totalt rekord</p>{playedDistances.map(s => {
          const best = Math.max(...rounds.filter(r => r.distance === s.distance).map(roundTotal));
          const lifetime = bestAt(progress, s.distance);
          const tier = masteryAt(s.distance, lifetime);
          return <div key={s.distance} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"><p className="text-sm font-black">{s.distance} m</p><p className="text-sm font-bold">{best}/12</p><p className="text-xs font-semibold text-slate-500">{lifetime}/12 · {tier ?? 'På väg'}</p></div>;
        })}</div> : <p className="my-5 text-center text-sm text-slate-500">Inga fullständiga rundor registrerade.</p>}
        <p className="my-4 text-center text-xs leading-5 text-slate-500">Mastery visar ditt bästa 3-bollsförsök, inte ett handicap. Underlag och förhållanden kan variera.</p>
        <button type="button" onClick={startPass} className={primary}>Nytt pass · 5 rundor <ChevronRight className="h-5 w-5" /></button>
        <button type="button" onClick={chooseStation} className={`${secondary} mt-3`}>Träna vidare · välj station</button>
        <button type="button" onClick={onExit} className="mt-2 min-h-12 w-full text-sm font-bold text-slate-600">Tillbaka till Practice Mode</button>
      </section> : null}
      {phase !== 'play' ? <p className="mt-5 text-center text-[10px] leading-4 text-slate-400">Stationer och rekord sparas på denna enhet{userId ? ' för ditt konto' : ' som gäst'}. Ingen HCP-testdata ändras.</p> : null}
    </>}

    <Dialog open={endDialog} onOpenChange={setEndDialog}><DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-[24px] border-slate-200 bg-white text-slate-950"><DialogTitle>Avsluta passet?</DialogTitle><DialogDescription className="text-slate-600">{current && phase === 'play' && current.shots.length ? `De ${current.shots.length} registrerade slagen i den pågående rundan tas inte med i poäng och mastery. Avslutade rundor är sparade.` : 'Dina avslutade rundor och upplåsta stationer är sparade. Du kan starta ett nytt pass senare.'}</DialogDescription><button type="button" onClick={finish} className={primary}>Visa passresultat</button><button type="button" onClick={() => setEndDialog(false)} className={secondary}>Fortsätt träna</button></DialogContent></Dialog>
    <Dialog open={rulesDialog} onOpenChange={setRulesDialog}><DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-[24px] border-slate-200 bg-white text-slate-950"><DialogTitle>Poäng & nivåer</DialogTitle><DialogDescription className="text-slate-600">Tre bollar från samma avstånd. När du når stationsmålet i en runda låses nästa avstånd upp. Du behöver aldrig Perfect för att gå vidare.</DialogDescription>
      <div>{CHIP_ZONES.map(z => <div key={z.points} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span>{z.label}</span><strong>{z.points} p</strong></div>)}</div>
      <p className="text-xs text-slate-500">Gränserna är inkluderande: exakt 1 m ger 3 p, exakt 2 m ger 2 p och exakt 3 m ger 1 p.</p>
      <div className="overflow-x-auto"><table className="w-full text-center text-xs"><caption className="pb-3 text-left text-sm font-bold text-slate-800">Mastery per avstånd</caption><thead><tr className="text-slate-500"><th className="p-1.5">m</th><th className="p-1.5">Bronze*</th><th className="p-1.5">Silver</th><th className="p-1.5">Gold</th><th className="p-1.5">Elite</th></tr></thead><tbody>{CHIP_STATIONS.map(s => <tr key={s.distance} className="border-t border-slate-100"><th className="p-2">{s.distance}</th>{s.tiers.filter(t => t.name !== 'Perfect').map(t => <td key={t.name} className="p-2">{t.points}</td>)}</tr>)}</tbody></table></div>
      <p className="text-xs leading-5 text-slate-500">* Bronze låser upp nästa distans. Perfect är alltid 12/12: tre sänkta chippar. Medaljer gäller personbästa; senaste snitt hjälper dig följa jämnheten. Målen är en första träningsmodell som kan kalibreras, inte en vetenskapligt fastställd HCP-skala.</p>
    </DialogContent></Dialog>
  </main>;
}
