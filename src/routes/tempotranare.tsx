import { createFileRoute, Link } from "@tanstack/react-router";
import { AudioLines, Check, Minus, Pause, Play, Plus, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  DEFAULT_TEMPO, PRESETS, loadTempo, loadTempoSessions, storeTempo, storeTempoSession, tempoTiming,
  type TempoMode, type TempoSettings, type TempoSound, type TempoSession,
} from "@/lib/tempo-trainer";

export const Route = createFileRoute("/tempotranare")({
  head: () => ({ meta: [
    { title: "Tempoträning – SG4" },
    { name: "description", content: "Träna golfens svingtempo med tre exakta ljudsignaler för start, vändning och bollträff." },
  ] }),
  component: TempoPage,
});

type Status = "idle" | "running" | "paused" | "finished";
type Cue = "start" | "top" | "impact" | null;
type WakeHandle = { release: () => Promise<void> };
type Engine = {
  ctx: AudioContext;
  first: number;
  next: number;
  base: number;
  limit: number | null;
  back: number;
  down: number;
  total: number;
  period: number;
  settings: TempoSettings;
  voices: Set<OscillatorNode>;
};

const MODES: Array<{ id: TempoMode; label: string; detail: string }> = [
  { id: "full", label: "Full sving", detail: "Driver & järn" },
  { id: "short", label: "Närspel", detail: "Chip & pitch" },
  { id: "putt", label: "Puttning", detail: "Kort & lång" },
];
const SOUNDS: Array<{ id: TempoSound; label: string; sub: string }> = [
  { id: "soft", label: "Mjuk", sub: "Tick · Tock · Ping" },
  { id: "digital", label: "Digital", sub: "Tre rena toner" },
  { id: "click", label: "Klick", sub: "Korta klick" },
  { id: "off", label: "Tyst", sub: "Visuell guide" },
];
const SELECTED = "border-blue-700 bg-blue-700 text-white";
const UNSELECTED = "border-slate-200 bg-white text-slate-700";
const fmt = (s: number) => s.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const labelMode = (mode: TempoMode) => MODES.find((m) => m.id === mode)?.label ?? "Full sving";
function audioClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

/** Schedule each cue on the audio clock, not JavaScript timers. */
function pulse(ctx: AudioContext, at: number, hz: number, duration: number, volume: number, kind: OscillatorType, voices?: Set<OscillatorNode>) {
  if (volume <= 0) return;
  const when = Math.max(ctx.currentTime + .004, at);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(hz, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(120, hz * .7), when + Math.min(duration * .7, .06));
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .004);
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (voices) {
    voices.add(osc);
    osc.onended = () => voices.delete(osc);
  }
  osc.start(when);
  osc.stop(when + duration + .01);
}
function playTone(ctx: AudioContext, at: number, cue: Exclude<Cue, null>, sound: TempoSound, volume: number, voices?: Set<OscillatorNode>) {
  if (sound === "off" || volume <= 0) return;
  const index = cue === "start" ? 0 : cue === "top" ? 1 : 2;
  if (sound === "soft") {
    if (cue === "impact") {
      pulse(ctx, at, 930, .19, volume * .12, "sine", voices);
      pulse(ctx, at, 1390, .12, volume * .035, "sine", voices);
    } else {
      pulse(ctx, at, [530, 390][index], .095, volume * .16, "triangle", voices);
      pulse(ctx, at, [980, 760][index], .035, volume * .05, "sine", voices);
    }
  } else if (sound === "digital") {
    pulse(ctx, at, [670, 530, 1050][index], cue === "impact" ? .18 : .105, volume * .13, "sine", voices);
  } else {
    pulse(ctx, at, [890, 660, 1150][index], cue === "impact" ? .085 : .045, volume * .13, "triangle", voices);
  }
}
function playedCount(e: Engine, now: number) {
  const elapsed = now - e.first;
  if (elapsed < e.total) return e.base;
  const value = e.base + Math.max(0, Math.floor((elapsed - e.total) / e.period + 1e-8) + 1);
  return e.limit === null ? value : Math.min(value, e.limit);
}
function TempoPage() {
  useHideBottomNav(true);
  const [settings, setSettings] = useState<TempoSettings>(DEFAULT_TEMPO);
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<TempoSession[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [played, setPlayed] = useState(0);
  const [shot, setShot] = useState(1);
  const [remaining, setRemaining] = useState(0);
  const [phase, setPhase] = useState("Redo att svinga");
  const [cue, setCue] = useState<Cue>(null);
  const [error, setError] = useState<string | null>(null);

  const engine = useRef<Engine | null>(null);
  const tickTimer = useRef<number | null>(null);
  const previewCtx = useRef<AudioContext | null>(null);
  const previewTimer = useRef<number | null>(null);
  const doneRef = useRef(0);
  const ticket = useRef(0);
  const wakeHandle = useRef<WakeHandle | null>(null);

  const timing = tempoTiming(settings.mode, settings.speeds[settings.mode]);
  const limit = settings.single ? 1 : settings.count === "unlimited" ? null : settings.count;
  const locked = status === "running" || status === "paused";

  useEffect(() => { setSettings(loadTempo()); setHistory(loadTempoSessions()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) storeTempo(settings); }, [hydrated, settings]);

  function releaseWake() {
    const handle = wakeHandle.current;
    wakeHandle.current = null;
    if (handle) void handle.release().catch(() => undefined);
  }
  function closeAudio() {
    ticket.current += 1;
    if (tickTimer.current !== null) window.clearInterval(tickTimer.current);
    tickTimer.current = null;
    const e = engine.current;
    engine.current = null;
    if (e) {
      for (const voice of e.voices) {
        try { voice.stop(); } catch { /* may have ended already */ }
      }
      if (e.ctx.state !== "closed") void e.ctx.close().catch(() => undefined);
    }
    releaseWake();
  }
  function closePreview() {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
    const ctx = previewCtx.current;
    previewCtx.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
  }
  function record(e: Engine | null, n: number, complete: boolean) {
    if (n < 1) return;
    const cfg = e?.settings ?? settings;
    setHistory(storeTempoSession({
      at: new Date().toISOString(),
      mode: cfg.mode,
      speed: cfg.speeds[cfg.mode],
      sequences: n,
      complete,
    }));
  }
  function stop() {
    const e = engine.current;
    const count = e ? playedCount(e, e.ctx.currentTime) : doneRef.current;
    record(e, count, false);
    closeAudio();
    doneRef.current = 0;
    setPlayed(0);
    setShot(1);
    setRemaining(0);
    setStatus("idle");
    setPhase("Redo att svinga");
    setCue(null);
    setError(null);
  }
  function pause() {
    const e = engine.current;
    if (!e) return;
    const count = playedCount(e, e.ctx.currentTime);
    doneRef.current = count;
    setPlayed(count);
    closeAudio();
    setStatus("paused");
    setPhase("Pausad");
    setRemaining(0);
    setCue(null);
    setShot(count + 1);
  }
  function finish(e: Engine) {
    const count = e.limit ?? playedCount(e, e.ctx.currentTime);
    doneRef.current = count;
    setPlayed(count);
    record(e, count, true);
    closeAudio();
    setStatus("finished");
    setPhase("Passet klart");
    setRemaining(0);
    setCue(null);
    setShot(count);
  }
  async function start() {
    closePreview();
    closeAudio();
    setError(null);
    const Audio = audioClass();
    if (!Audio) { setError("Ljuduppspelning stöds inte i den här webbläsaren."); return; }
    const from = status === "paused" ? doneRef.current : 0;
    if (status !== "paused") { doneRef.current = 0; setPlayed(0); }
    if (limit !== null && from >= limit) { setStatus("finished"); return; }
    let ctx: AudioContext;
    try { ctx = new Audio(); }
    catch { setError("Kunde inte öppna ljudmotorn. Kontrollera webbläsarens ljudinställningar."); return; }
    const id = ticket.current;
    setStatus("running");
    setPhase("Förbered dig");
    setCue(null);
    setShot(from + 1);
    try { await ctx.resume(); }
    catch {
      if (ctx.state !== "closed") void ctx.close().catch(() => undefined);
      setStatus("paused");
      setError("Kunde inte starta ljudet. Tryck på Start igen.");
      return;
    }
    if (ticket.current !== id) { if (ctx.state !== "closed") void ctx.close().catch(() => undefined); return; }
    const t = tempoTiming(settings.mode, settings.speeds[settings.mode]);
    const first = ctx.currentTime + settings.delay + .08;
    const e: Engine = {
      ctx, first, next: 0, base: from, limit, back: t.back, down: t.down, total: t.total,
      period: t.total + settings.rest, settings: { ...settings, speeds: { ...settings.speeds } }, voices: new Set(),
    };
    engine.current = e;
    for (let n = 3; n >= 1; n--) {
      if (settings.sound !== "off") pulse(ctx, first - n, 440, .065, settings.volume * .055, "sine", e.voices);
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeHandle> } };
    if (nav.wakeLock) {
      void nav.wakeLock.request("screen").then((h) => {
        if (engine.current === e) wakeHandle.current = h;
        else void h.release().catch(() => undefined);
      }).catch(() => undefined);
    }
    const tick = () => {
      if (engine.current !== e || ctx.state !== "running") return;
      const now = ctx.currentTime;
      while ((e.limit === null || e.base + e.next < e.limit) &&
        e.first + e.next * e.period < now + .4) {
        const at = e.first + e.next * e.period;
        playTone(ctx, at, "start", e.settings.sound, e.settings.volume, e.voices);
        playTone(ctx, at + e.back, "top", e.settings.sound, e.settings.volume, e.voices);
        playTone(ctx, at + e.total, "impact", e.settings.sound, e.settings.volume, e.voices);
        e.next += 1;
      }
      const count = playedCount(e, now);
      doneRef.current = count;
      setPlayed(count);
      const elapsed = now - e.first;
      if (elapsed < 0) {
        setPhase("Förbered dig");
        setRemaining(Math.ceil(-elapsed));
        setShot(e.base + 1);
        setCue(null);
        return;
      }
      if (e.limit !== null && count >= e.limit &&
        elapsed >= (e.limit - e.base - 1) * e.period + e.total + .22) {
        finish(e);
        return;
      }
      const index = Math.floor(elapsed / e.period);
      const within = elapsed - index * e.period;
      setShot(e.base + index + 1);
      setRemaining(0);
      setPhase(within < e.back ? "Baksving" : within < e.total ? "Nedsving" : "Förbered nästa sving");
      setCue(within < .15 ? "start"
        : within >= e.back && within < e.back + .15 ? "top"
        : within >= e.total && within < e.total + .18 ? "impact" : null);
    };
    tickTimer.current = window.setInterval(tick, 35);
    tick();
  }
  async function preview() {
    closePreview();
    if (settings.sound === "off" || settings.volume <= 0) return;
    const Audio = audioClass();
    if (!Audio) { setError("Ljud stöds inte i den här webbläsaren."); return; }
    try {
      const ctx = new Audio();
      previewCtx.current = ctx;
      await ctx.resume();
      if (previewCtx.current !== ctx) return;
      const now = ctx.currentTime + .08;
      playTone(ctx, now, "start", settings.sound, settings.volume);
      playTone(ctx, now + .48, "top", settings.sound, settings.volume);
      playTone(ctx, now + .96, "impact", settings.sound, settings.volume);
      previewTimer.current = window.setTimeout(closePreview, 1600);
    } catch {
      closePreview();
      setError("Kunde inte spela upp ljudet. Kontrollera volym och ljudutgång.");
    }
  }
  function edit(patch: Partial<TempoSettings>) {
    if (locked) return;
    if (status === "finished") { doneRef.current = 0; setPlayed(0); setStatus("idle"); }
    setSettings((old) => ({ ...old, ...patch }));
  }
  function changeSpeed(s: number) {
    if (locked) return;
    const value = Math.max(.45, Math.min(1.1, Math.round(s * 100) / 100));
    edit({ speeds: { ...settings.speeds, [settings.mode]: value } });
  }
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && engine.current) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      // Tear down audio/timers on navigation; do not claim a physical swing was measured.
      if (tickTimer.current !== null) window.clearInterval(tickTimer.current);
      tickTimer.current = null;
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
      const e = engine.current;
      engine.current = null;
      if (e && e.ctx.state !== "closed") void e.ctx.close().catch(() => undefined);
      const p = previewCtx.current;
      previewCtx.current = null;
      if (p && p.state !== "closed") void p.close().catch(() => undefined);
      const handle = wakeHandle.current;
      wakeHandle.current = null;
      if (handle) void handle.release().catch(() => undefined);
      ticket.current += 1;
    };
  }, []);
  const cues = [
    { key: "start" as const, title: "Start", time: 0 },
    { key: "top" as const, title: "Vändning", time: timing.back },
    { key: "impact" as const, title: "Bollträff", time: timing.total },
  ];
  const choice = (active: boolean) => "rounded-xl border px-2 py-2.5 text-center text-xs font-bold disabled:opacity-40 " + (active ? SELECTED : UNSELECTED);
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-[#f7f9fd] px-5 pb-24 pt-6 text-slate-950">
      <div className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-700">SG4 · Träningsverktyg</div>
      <h1 className="mt-1 font-display text-[40px] leading-none">Tempoträning</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Tre ljudsignaler visar när du startar, vänder och träffar bollen. Träna ett jämnt tempo utan att titta på skärmen.</p>

      <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Välj slagtyp">
        {MODES.map((m) => (
          <button type="button" key={m.id} disabled={locked} aria-pressed={settings.mode === m.id}
            onClick={() => edit({ mode: m.id })}
            className={"rounded-2xl border px-2 py-3 text-center disabled:opacity-40 " + (settings.mode === m.id ? SELECTED : UNSELECTED)}>
            <span className="block text-xs font-bold">{m.label}</span>
            <span className="mt-1 block text-[10px] opacity-70">{m.detail}</span>
          </button>
        ))}
      </div>

      <section className="relative mt-4 overflow-hidden rounded-[30px] bg-[#0b1c3c] p-5 text-white shadow-lg">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-200"><AudioLines className="h-4 w-4"/> Svingtempo</span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold">{labelMode(settings.mode)}</span>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="font-display text-[68px] leading-none">{timing.ratio}:1</div>
              <p className="mt-1 text-xs font-semibold text-blue-200">{fmt(timing.total)} s per sekvens</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-blue-100/70">Sekvens</p>
              <p className="mt-1 font-display text-2xl">{limit === null ? played : shot + " / " + limit}</p>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2" aria-label="Tidslinje för ljud">
            {cues.map((c, i) => (
              <div key={c.key} className={"rounded-2xl border px-2 py-3 text-center " + (status === "running" && cue === c.key ? "border-sky-300 bg-blue-500/40" : "border-white/15 bg-white/5")}>
                <span className={"mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-black " + (status === "running" && cue === c.key ? "bg-white text-blue-800" : "bg-white/15")}>{i + 1}</span>
                <p className="mt-2 text-xs font-bold">{c.title}</p>
                <p className="mt-1 text-[10px] text-blue-200">{fmt(c.time)} s</p>
              </div>
            ))}
          </div>
          <div className="mt-5 h-12 text-center" role="status" aria-live="polite">
            <p className="text-sm font-bold">{phase}</p>
            <p className="mt-1 text-[11px] text-blue-100/80">
              {status === "running" && remaining > 0 ? "Start om " + remaining + " s"
                : status === "finished" ? played + " ljudsekvenser avslutade"
                : status === "paused" ? "Fortsätt med ny nedräkning"
                : "Tick · Tock · Ping"}
            </p>
          </div>
          {status === "running" ? (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={pause} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-base font-extrabold text-slate-950"><Pause className="h-5 w-5"/> Pausa</button>
              <button type="button" onClick={stop} className="rounded-2xl border border-white/30 px-4 text-sm font-bold">Avsluta</button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => void start()}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#399eff] text-base font-extrabold text-white">
                {status === "finished" ? <RotateCcw className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
                {status === "paused" ? "Fortsätt" : status === "finished" ? "Starta igen" : "Starta"}
              </button>
              {status === "paused" ? <button type="button" onClick={stop} className="rounded-2xl border border-white/30 px-4 text-sm font-bold">Avsluta</button> : null}
            </div>
          )}
        </div>
      </section>
      {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      {locked ? <p className="mt-3 text-center text-xs text-slate-500">Avsluta för att ändra inställningarna.</p> : null}

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-bold">Hastighet</h2><p className="text-xs text-slate-500">Samma förhållande, olika svingtid</p></div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{timing.ratio}:1</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {PRESETS[settings.mode].map((v, i) => (
            <button type="button" key={i} disabled={locked} aria-label={"Hastighet " + (i + 1)}
              aria-pressed={Math.abs(timing.back - v) < .005}
              onClick={() => changeSpeed(v)}
              className={"flex min-h-[59px] flex-col items-center justify-center rounded-xl border disabled:opacity-40 " +
                (Math.abs(timing.back - v) < .005 ? SELECTED : UNSELECTED)}>
              <span className="text-sm font-black">{i + 1}</span><span className="mt-1 text-[10px] font-bold">{fmt(v)}s</span>
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>Lugnare</span><span>Snabbare</span></div>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Finjustera baksving</p><p className="font-display text-2xl">{fmt(timing.back)} s</p></div>
          <button type="button" disabled={locked || timing.back <= .45} onClick={() => changeSpeed(timing.back - .02)}
            aria-label="Minska tiden med 0,02 sekunder" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"><Minus className="h-5 w-5"/></button>
          <button type="button" disabled={locked || timing.back >= 1.1} onClick={() => changeSpeed(timing.back + .02)}
            aria-label="Öka tiden med 0,02 sekunder" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"><Plus className="h-5 w-5"/></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          <p className="rounded-xl bg-slate-50 p-3"><strong className="block">{fmt(timing.back)} s</strong><span className="text-slate-500">Baksving</span></p>
          <p className="rounded-xl bg-slate-50 p-3"><strong className="block">{fmt(timing.down)} s</strong><span className="text-slate-500">Nedsving</span></p>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Träningspass</h2>
        <p className="mt-1 text-xs text-slate-500">Välj ett slag eller automatisk repetition.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={locked} onClick={() => edit({ single: true })} className={choice(settings.single)}>En sving</button>
          <button type="button" disabled={locked} onClick={() => edit({ single: false })} className={choice(!settings.single)}>Repetera</button>
        </div>
        {!settings.single ? (
          <div className="mt-4"><p className="mb-2 text-xs font-bold">Antal sekvenser</p>
            <div className="grid grid-cols-4 gap-2">
              {([5, 10, 20, "unlimited"] as const).map((n) =>
                <button type="button" key={n} disabled={locked} onClick={() => edit({ count: n })}
                  className={choice(settings.count === n)}>{n === "unlimited" ? "∞" : n}</button>)}
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="mb-2 text-xs font-bold">Nedräkning</p><div className="grid grid-cols-3 gap-1">
            {([3, 5, 10] as const).map((n) => <button type="button" key={n} disabled={locked} onClick={() => edit({ delay: n })} className={choice(settings.delay === n)}>{n}s</button>)}
          </div></div>
          <div><p className="mb-2 text-xs font-bold">Paus mellan</p><div className="grid grid-cols-3 gap-1">
            {([3, 5, 8] as const).map((n) => <button type="button" key={n} disabled={locked || settings.single} onClick={() => edit({ rest: n })} className={choice(settings.rest === n)}>{n}s</button>)}
          </div></div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><Volume2 className="h-5 w-5 text-blue-700"/><h2 className="text-lg font-bold">Ljud</h2></div>
        <p className="mt-1 text-xs text-slate-500">Start · Vändning · Bollträff</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SOUNDS.map((s) => (
            <button type="button" key={s.id} disabled={locked} onClick={() => edit({ sound: s.id })}
              aria-pressed={settings.sound === s.id}
              className={"relative min-h-[72px] rounded-2xl border p-3 text-left disabled:opacity-40 " +
                (settings.sound === s.id ? "border-blue-700 bg-blue-50 text-blue-950" : UNSELECTED)}>
              {settings.sound === s.id ? <Check className="absolute right-2 top-2 h-4 w-4 text-blue-700"/> : null}
              <span className="block text-sm font-bold">{s.label}</span><span className="mt-1 block text-[10px] text-slate-500">{s.sub}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <VolumeX className="h-4 w-4 text-slate-500"/>
          <input type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
            aria-label="Ljudvolym" disabled={locked || settings.sound === "off"}
            onChange={(ev) => edit({ volume: Number(ev.target.value) / 100 })}
            className="w-full accent-blue-700 disabled:opacity-40"/>
          <Volume2 className="h-4 w-4 text-slate-500"/>
          <span className="w-8 text-right text-xs font-bold">{Math.round(settings.volume * 100)}%</span>
        </div>
        <button type="button" onClick={() => void preview()} disabled={locked || settings.sound === "off" || settings.volume === 0}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-800 disabled:opacity-40"><AudioLines className="h-4 w-4"/> Testa ljud</button>
      </section>

      {history.length ? (
        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">Senaste passen</h2>
          <p className="mt-1 text-xs text-slate-500">Ljudsekvenser som spelats upp – inte uppmätta golfslag.</p>
          <div className="mt-3 divide-y divide-slate-100">
            {history.slice(0, 4).map((row, i) => (
              <div key={row.at + i} className="flex items-center justify-between py-3 text-xs">
                <div><strong className="block">{labelMode(row.mode)} · {fmt(row.speed)} s</strong>
                  <span className="text-slate-500">{new Date(row.at).toLocaleDateString("sv-SE")} · {row.complete ? "Klart" : "Avslutat"}</span></div>
                <strong className="text-blue-700">{row.sequences} st</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
        Riktvärden: full sving 3:1, närspel och puttning 2:1. SG4 spelar ett valt tempo men mäter inte din verkliga sving.
        Bluetooth-hörlurar kan ge ljudfördröjning. Om appen lämnas pausas passet.
      </p>
      <div className="mt-5 text-center"><Link to="/spel" className="text-sm font-bold text-blue-700">Tillbaka till Spel</Link></div>
    </main>
  );
}
