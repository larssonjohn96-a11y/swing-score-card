import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, Check, ChevronDown, Minus, Pause, Play, Plus, RotateCcw, Settings2, Smartphone, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TempoMotion } from "@/components/tempo-motion";
import type { TempoClock } from "@/lib/tempo-visual";
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
  const [expanded, setExpanded] = useState(false);
  const [hapticAvailable, setHapticAvailable] = useState(false);

  const engine = useRef<Engine | null>(null);
  const tickTimer = useRef<number | null>(null);
  const previewCtx = useRef<AudioContext | null>(null);
  const previewTimer = useRef<number | null>(null);
  const doneRef = useRef(0);
  const ticket = useRef(0);
  const wakeHandle = useRef<WakeHandle | null>(null);
  const settingsSection = useRef<HTMLDivElement | null>(null);
  const hero = useRef<HTMLElement | null>(null);
  const readClock = useCallback((): TempoClock | null => {
    const e = engine.current;
    return e ? { now: e.ctx.currentTime, first: e.first, back: e.back, total: e.total, period: e.period } : null;
  }, []);

  const timing = tempoTiming(settings.mode, settings.speeds[settings.mode]);
  const limit = settings.single ? 1 : settings.count === "unlimited" ? null : settings.count;
  const locked = status === "running" || status === "paused";

  useEffect(() => { setSettings(loadTempo()); setHistory(loadTempoSessions()); setHydrated(true); }, []);
  useEffect(() => { setHapticAvailable(typeof navigator !== "undefined" && typeof navigator.vibrate === "function"); }, []);
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
    hero.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    { id: "start" as const, label: "Start" },
    { id: "top" as const, label: "Vändning" },
    { id: "impact" as const, label: "Träff" },
  ];
  const choice = (active: boolean) =>
    "rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-40 " + (active ? SELECTED : UNSELECTED);
  const toggleSettings = () => {
    setExpanded((v) => !v);
    if (!expanded) window.setTimeout(() => settingsSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-[#f5f8fd] px-4 pb-[max(30px,env(safe-area-inset-bottom))] pt-[max(13px,env(safe-area-inset-top))] text-slate-950">
      <header className="flex h-12 items-center justify-between">
        <Link to="/spel" aria-label="Tillbaka till Spel"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[.21em] text-blue-600">SG4 · Träningsverktyg</p>
          <h1 className="font-display text-[24px] leading-tight">Tempoträning</h1>
        </div>
        <button type="button" onClick={toggleSettings} aria-label="Visa inställningar" aria-expanded={expanded}
          aria-controls="tempo-extra"
          className={"flex h-11 w-11 items-center justify-center rounded-full border bg-white " + (expanded ? "border-blue-500 text-blue-700" : "border-slate-200 text-slate-600")}>
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-200/60 p-1" role="group" aria-label="Välj slagtyp">
        {MODES.map((mode) => (
          <button type="button" key={mode.id} disabled={locked} aria-pressed={settings.mode === mode.id}
            onClick={() => edit({ mode: mode.id })}
            className={"min-h-11 rounded-xl text-[12px] font-bold transition disabled:opacity-50 " +
              (settings.mode === mode.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600")}>
            {mode.label}
          </button>
        ))}
      </div>

      <section ref={hero} aria-label="Animerad tempoguide"
        className="relative mt-3 h-[clamp(350px,57dvh,610px)] overflow-hidden rounded-[32px] bg-[#091b39] text-white shadow-[0_22px_42px_-27px_rgba(9,27,57,.7)]">
        <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#93b7eb]">Ditt tempo</p>
            <p className="mt-1 font-display text-[20px] leading-none">{fmt(timing.back)} <span className="text-xs font-medium text-[#a2bfe8]">s bak</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#93b7eb]">Sekvens</p>
            <p className="mt-1 font-display text-xl leading-none">
              {limit === null ? played : `${Math.min(shot, limit)} / ${limit}`}
            </p>
          </div>
        </div>

        <TempoMotion mode={settings.mode} ratio={timing.ratio} total={timing.total}
          running={status === "running"} haptics={hapticAvailable && settings.haptics} clock={readClock} />

        <div className="absolute inset-x-5 bottom-5 z-10">
          <div className="mb-4 h-7 text-center text-[13px] font-semibold tracking-wide text-[#dceeff]"
            role="status" aria-live="polite">
            {status === "running" && remaining > 0
              ? `Start om ${remaining} s`
              : status === "paused" ? "Pausad · fortsätt när du är redo"
              : status === "finished" ? `Klart · ${played} ljudsekvenser` : phase}
          </div>
          <div className="flex items-center justify-center gap-6">
            {cues.map((stage) => (
              <span key={stage.id}
                className={"flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] transition-colors " +
                  (status === "running" && cue === stage.id ? "text-white" : "text-[#81a2d1]")}>
                <span className={"h-1.5 w-1.5 rounded-full " + (status === "running" && cue === stage.id ? "bg-[#64b8ff]" : "bg-[#536d93]")} />
                {stage.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={locked || timing.back <= .45}
          onClick={() => changeSpeed(timing.back - .02)}
          aria-label="Snabbare svingtempo" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white disabled:opacity-35">
          <Minus className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] font-bold text-slate-900">{fmt(timing.back)} s <span className="font-medium text-slate-500">bak</span> · {fmt(timing.down)} s <span className="font-medium text-slate-500">ner</span></p>
          <p className="mt-1 text-[10px] text-slate-500">{timing.ratio}:1 · {labelMode(settings.mode)} · {settings.single ? "En sving" : settings.count === "unlimited" ? "Obegränsat" : `${settings.count} repetitioner`}</p>
        </div>
        <button type="button" disabled={locked || timing.back >= 1.1}
          onClick={() => changeSpeed(timing.back + .02)}
          aria-label="Lugnare svingtempo" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white disabled:opacity-35">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {status === "running" ? (
          <>
            <button type="button" onClick={pause}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-700 text-[16px] font-bold text-white">
              <Pause className="h-5 w-5" /> Pausa
            </button>
            <button type="button" onClick={stop}
              className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 text-[13px] font-bold">Avsluta</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => void start()}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-700 text-[16px] font-bold text-white">
              {status === "finished" ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {status === "paused" ? "Fortsätt" : status === "finished" ? "Starta igen" : "Starta"}
            </button>
            {status === "paused" ? (
              <button type="button" onClick={stop}
                className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 text-[13px] font-bold">Avsluta</button>
            ) : null}
          </>
        )}
      </div>
      {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}

      <div ref={settingsSection} id="tempo-extra" className="scroll-mt-4">
        <button type="button" onClick={toggleSettings} aria-expanded={expanded} aria-controls="tempo-panel"
          className="mt-4 flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-500">
          {expanded ? "Dölj inställningar" : "Fler inställningar"}
          <ChevronDown className={"h-4 w-4 transition-transform " + (expanded ? "rotate-180" : "")} />
        </button>
        {expanded ? (
          <section id="tempo-panel" aria-label="Fler inställningar"
            className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {locked ? <p className="mb-4 text-xs text-slate-500">Pausa och avsluta passet för att ändra inställningarna.</p> : null}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Hastighet</h2>
                <span className="text-xs font-semibold text-blue-700">{timing.ratio}:1</span>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {PRESETS[settings.mode].map((v, i) => (
                  <button type="button" key={i} disabled={locked} aria-label={`Tempo ${i + 1}: ${fmt(v)} sekunder baksving`}
                    aria-pressed={Math.abs(timing.back - v) < .005} onClick={() => changeSpeed(v)}
                    className={"min-h-12 rounded-xl border text-xs font-bold disabled:opacity-40 " +
                      (Math.abs(timing.back - v) < .005 ? SELECTED : UNSELECTED)}>
                    {fmt(v)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Lugnare ← · → Snabbare</p>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-[15px] font-bold">Träningspass</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={locked} onClick={() => edit({ single: true })}
                  className={choice(settings.single)}>En sving</button>
                <button type="button" disabled={locked} onClick={() => edit({ single: false })}
                  className={choice(!settings.single)}>Repetera</button>
              </div>
              {!settings.single ? (
                <>
                  <p className="mb-2 mt-4 text-xs font-semibold">Antal sekvenser</p>
                  <div className="grid grid-cols-4 gap-2">
                    {([5, 10, 20, "unlimited"] as const).map((n) => (
                      <button type="button" key={n} disabled={locked} onClick={() => edit({ count: n })}
                        className={choice(settings.count === n)}>{n === "unlimited" ? "∞" : n}</button>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold">Nedräkning</p>
                  <div className="grid grid-cols-3 gap-1">
                    {([3, 5, 10] as const).map((n) => (
                      <button type="button" key={n} disabled={locked} onClick={() => edit({ delay: n })}
                        className={choice(settings.delay === n)}>{n}s</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold">Paus mellan slag</p>
                  <div className="grid grid-cols-3 gap-1">
                    {([3, 5, 8] as const).map((n) => (
                      <button type="button" key={n} disabled={locked || settings.single}
                        onClick={() => edit({ rest: n })}
                        className={choice(settings.rest === n)}>{n}s</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                <AudioLines className="h-4 w-4 text-blue-700" /> Ljud
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SOUNDS.map((sound) => (
                  <button type="button" key={sound.id} disabled={locked} aria-pressed={settings.sound === sound.id}
                    onClick={() => edit({ sound: sound.id })}
                    className={"relative min-h-16 rounded-xl border p-3 text-left disabled:opacity-40 " +
                      (settings.sound === sound.id ? "border-blue-700 bg-blue-50 text-blue-950" : UNSELECTED)}>
                    {settings.sound === sound.id ? <Check className="absolute right-2 top-2 h-4 w-4 text-blue-700" /> : null}
                    <span className="block text-xs font-bold">{sound.label}</span>
                    <span className="mt-1 block text-[10px] text-slate-500">{sound.sub}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-slate-500" />
                <input type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
                  aria-label="Volym" disabled={locked || settings.sound === "off"}
                  onChange={(e) => edit({ volume: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-700 disabled:opacity-40" />
                <Volume2 className="h-4 w-4 text-slate-500" />
              </div>
              <button type="button" disabled={locked || settings.sound === "off" || settings.volume === 0}
                onClick={() => void preview()}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700 disabled:opacity-40">
                <AudioLines className="h-4 w-4" /> Testa ljud
              </button>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-700" />
                  <div>
                    <h2 className="text-[15px] font-bold">Haptik</h2>
                    <p className="text-[11px] text-slate-500">Vibration vid start, vändning och träff</p>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={hapticAvailable && settings.haptics}
                  aria-label="Aktivera vibrationer"
                  disabled={locked || !hapticAvailable}
                  onClick={() => edit({ haptics: !settings.haptics })}
                  className={"relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 " +
                    (hapticAvailable && settings.haptics ? "bg-blue-700" : "bg-slate-200")}>
                  <span className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all " +
                    (hapticAvailable && settings.haptics ? "left-7" : "left-1")} />
                </button>
              </div>
              {!hapticAvailable ? <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Vibration stöds inte av den här webbläsaren (t.ex. Safari på iPhone). Ljud och animation fungerar ändå.</p> :
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Valfri vibration. Tidpunkten kan variera något mellan telefoner.</p>}
            </div>
          </section>
        ) : null}
      </div>

      {history.length ? (
        <details className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">Tidigare pass · {history.length}</summary>
          <p className="mt-3 text-[11px] text-slate-500">Spelade ljudsekvenser, inte uppmätta golfslag.</p>
          <div className="divide-y divide-slate-100">
            {history.slice(0, 5).map((row, index) => (
              <div key={row.at + index} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <strong className="block">{labelMode(row.mode)} · {fmt(row.speed)} s</strong>
                  <span className="text-slate-500">{new Date(row.at).toLocaleDateString("sv-SE")} · {row.complete ? "Klart" : "Avslutat"}</span>
                </div>
                <strong className="text-blue-700">{row.sequences} st</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
        Ljud, rörelse och valfri vibration följer samma tidpunkter. SG4 guidar ditt tempo, men mäter ännu inte din faktiska sving.
        Bluetooth kan introducera ljudfördröjning.
      </p>
    </main>
  );
}
