import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, Minus, Pause, Play, Plus, RotateCcw, Settings2, Smartphone, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TempoMotion } from "@/components/tempo-motion";
import type { TempoClock } from "@/lib/tempo-visual";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  DEFAULT_TEMPO, PRESETS, TEMPO_RATIOS, loadTempo, loadTempoSessions, storeTempo, storeTempoSession, tempoTiming,
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
  follow: number;
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
  const [panel, setPanel] = useState<"ratio" | "settings" | null>(null);
  const [hapticAvailable, setHapticAvailable] = useState(false);

  const engine = useRef<Engine | null>(null);
  const tickTimer = useRef<number | null>(null);
  const previewCtx = useRef<AudioContext | null>(null);
  const previewTimer = useRef<number | null>(null);
  const doneRef = useRef(0);
  const ticket = useRef(0);
  const wakeHandle = useRef<WakeHandle | null>(null);
  const readClock = useCallback((): TempoClock | null => {
    const e = engine.current;
    return e ? { now: e.ctx.currentTime, first: e.first, back: e.back, total: e.total, follow: e.follow, period: e.period } : null;
  }, []);

  const timing = tempoTiming(settings.mode, settings.durations[settings.mode], settings.ratios[settings.mode]);
  const limit = settings.single ? 1 : settings.count === "unlimited" ? null : settings.count;
  const locked = status === "running";

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
      speed: tempoTiming(cfg.mode, cfg.durations[cfg.mode], cfg.ratios[cfg.mode]).back,
      ratio: cfg.ratios[cfg.mode],
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
    const t = tempoTiming(settings.mode, settings.durations[settings.mode], settings.ratios[settings.mode]);
    const first = ctx.currentTime + settings.delay + .08;
    const e: Engine = {
      ctx, first, next: 0, base: from, limit, back: t.back, down: t.down, total: t.total, follow: t.follow,
      period: t.total + t.follow + settings.rest,
      settings: { ...settings, durations: { ...settings.durations }, ratios: { ...settings.ratios } }, voices: new Set(),
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
        setRemaining(Math.min(settings.delay, Math.ceil(-elapsed)));
        setShot(e.base + 1);
        setCue(null);
        return;
      }
      if (e.limit !== null && count >= e.limit &&
        elapsed >= (e.limit - e.base - 1) * e.period + e.total + e.follow + .22) {
        finish(e);
        return;
      }
      const index = Math.floor(elapsed / e.period);
      const within = elapsed - index * e.period;
      setShot(e.base + index + 1);
      setRemaining(0);
      setPhase(within < e.back ? "Baksving" : within < e.total ? "Nedsving" : within < e.total + e.follow ? "Genomsvängning" : "Finish");
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
    const value = Math.max(.6, Math.min(1.8, Math.round(s * 100) / 100));
    edit({ durations: { ...settings.durations, [settings.mode]: value } });
  }
  const changeRatio = (ratio: number) => {
    if (locked || !TEMPO_RATIOS[settings.mode].includes(ratio)) return;
    edit({ ratios: { ...settings.ratios, [settings.mode]: ratio } });
    setPanel(null);
  };
  const openPanel = (name: "ratio" | "settings") => {
    // Pause before editing so audio and animation always share the same new timeline.
    if (status === "running") pause();
    setPanel(name);
  };
  useEffect(() => {
    if (!panel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [panel]);
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


  const pickClass = (on: boolean) =>
    "min-h-10 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition disabled:opacity-40 " +
    (on ? "border-[#70b6ff] bg-blue-600/30 text-white" : "border-white/15 bg-white/[.055] text-[#b9cae3]");
  const ratioText = `${timing.ratio}:1`;
  const speedText = fmt(timing.total);
  return (
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#081b37] px-4 text-white"
      style={{ paddingTop: "max(10px, env(safe-area-inset-top))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <header className="z-10 flex h-11 shrink-0 items-center justify-between">
        <Link to="/spel" aria-label="Tillbaka till Spel"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[.05]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[21px] leading-tight tracking-tight">Tempoträning</h1>
        <button type="button" onClick={() => openPanel("settings")} aria-label="Träningsinställningar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[.05]">
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      <div className="z-10 mt-3 grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-white/[.07] p-1"
        role="group" aria-label="Välj slagtyp">
        {MODES.map((mode) => (
          <button type="button" key={mode.id} aria-pressed={settings.mode === mode.id}
            onClick={() => {
              if (status === "running") pause();
              setSettings((s) => ({ ...s, mode: mode.id }));
            }}
            className={"min-h-11 rounded-xl text-[12px] font-semibold transition " +
              (settings.mode === mode.id ? "bg-[#3485ea] text-white" : "text-[#aebfdb]")}>
            {mode.label}
          </button>
        ))}
      </div>

      <section className="relative min-h-0 flex-1" aria-label="Visuell svingsimulator">
        <TempoMotion mode={settings.mode} running={status === "running"} finished={status === "finished"}
          haptics={hapticAvailable && settings.haptics} clock={readClock} />

        <div className="absolute left-1/2 top-[43%] z-10 w-[66%] -translate-x-1/2 -translate-y-1/2 text-center">
          {status === "running" && remaining > 0 ? (
            <div aria-label={`Startar om ${remaining} sekunder`}>
              <div className="font-display text-[74px] leading-none">{remaining}</div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#8eb8ec]">Startar snart</p>
            </div>
          ) : (
            <button type="button" onClick={() => openPanel("ratio")}
              aria-label={`Ändra tempoförhållande. Nu ${ratioText}. Baksvingen tar ${timing.ratio} gånger så lång tid som nedsvingen.`}
              className="w-full rounded-2xl px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
              <div className="font-display text-[clamp(60px,16vw,86px)] leading-none tracking-[-.04em]">{ratioText}</div>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[.15em] text-[#a8c7ed]">Tempo · baksving : nedsving</p>
              <p className="mt-2 text-[11px] leading-snug text-[#8aadd8]">Baksvingen tar {timing.ratio} gånger så lång tid som nedsvingen</p>
              <p className="mt-2 text-[10px] font-semibold text-[#6eacff]">Tryck för att ändra</p>
            </button>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
          <p className="text-[14px] font-medium tracking-wide text-[#c7e0ff]" aria-live="off">
            {status === "running" && remaining > 0 ? "Förbered dig"
              : status === "paused" ? "Pausad"
              : status === "finished" ? "Passet klart"
              : status === "running" ? phase : "Starta när du är redo"}
          </p>
          <p className="mt-1 text-[11px] text-[#7899c8]">
            {status === "finished" ? `${played} sekvenser klara`
              : `Sekvens ${status === "running" || status === "paused" ? shot : 1}${limit === null ? "" : ` av ${limit}`}`}
          </p>
        </div>
      </section>

      <div className="z-10 mt-4 shrink-0 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label="Öka hastigheten"
            disabled={locked || timing.total <= .6}
            onClick={() => changeSpeed(timing.total - .05)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[.06] disabled:opacity-30">
            <Minus className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#9ebbe2]">Hastighet</p>
            <p className="font-display text-[27px] leading-tight">{speedText} s</p>
            <p className="text-[10px] leading-tight text-[#92acd0]">Total tid från start till impact</p>
          </div>
          <button type="button" aria-label="Minska hastigheten"
            disabled={locked || timing.total >= 1.8}
            onClick={() => changeSpeed(timing.total + .05)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[.06] disabled:opacity-30">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {status === "running" ? (
            <>
              <button type="button" onClick={pause}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#438ff5] text-[16px] font-bold text-white">
                <Pause className="h-5 w-5" /> Pausa
              </button>
              <button type="button" onClick={stop}
                className="min-h-14 rounded-2xl border border-white/20 px-4 text-[13px] font-bold">Avsluta</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void start()}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#438ff5] text-[16px] font-bold text-white">
                {status === "finished" ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {status === "paused" ? "Fortsätt" : status === "finished" ? "Starta igen" : "Starta"}
              </button>
              {status === "paused" ? (
                <button type="button" onClick={stop}
                  className="min-h-14 rounded-2xl border border-white/20 px-4 text-[13px] font-bold">Avsluta</button>
              ) : null}
            </>
          )}
        </div>
        <button type="button" onClick={() => openPanel("settings")}
          className="mt-1 flex min-h-9 w-full items-center justify-center gap-2 text-[11px] text-[#9ab6da]">
          {settings.sound === "off" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{settings.sound === "off" ? "Tyst" : "Ljud på"}</span>
          <span className="text-white/20">·</span>
          <span>{hapticAvailable ? settings.haptics ? "Haptik på" : "Haptik av" : "Haptik stöds inte"}</span>
          <span className="text-white/20">·</span>
          <span>{settings.single ? "En sving" : settings.count === "unlimited" ? "Obegränsat" : `${settings.count} svingar`}</span>
        </button>
      </div>

      {error ? <div role="alert" className="absolute inset-x-4 bottom-32 z-30 rounded-xl border border-red-300 bg-[#3b1928] p-3 text-xs text-white">{error}</div> : null}

      {panel !== null ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-[#020b1a]/80 p-3 backdrop-blur-md"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <button type="button" className="absolute inset-0" onClick={() => setPanel(null)}
            aria-label="Stäng inställningar" />
          <div role="dialog" aria-modal="true"
            aria-label={panel === "ratio" ? "Ändra tempo" : "Träningsinställningar"}
            className="relative z-10 w-full max-h-[calc(100dvh-42px)] overflow-y-auto rounded-[26px] border border-white/15 bg-[#112c52] p-5 shadow-2xl [scrollbar-width:thin]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[28px] leading-none">{panel === "ratio" ? "Tempo" : "Inställningar"}</h2>
              <button type="button" onClick={() => setPanel(null)} aria-label="Stäng"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel === "ratio" ? (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-[#a8c7ed]">
                  Tempot är förhållandet mellan baksving och nedsving.
                  Exempel: 3:1 betyder att baksvingen tar tre gånger så lång tid.
                </p>
                <div className="mt-5 grid grid-cols-5 gap-1.5">
                  {TEMPO_RATIOS[settings.mode].map((ratio) => (
                    <button type="button" key={ratio} aria-pressed={settings.ratios[settings.mode] === ratio}
                      onClick={() => changeRatio(ratio)}
                      className={pickClass(settings.ratios[settings.mode] === ratio)}>
                      {ratio}:1
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-white/[.05] p-3 text-[12px] leading-relaxed text-[#b5cbe8]">
                  <strong className="text-white">Hastighet förändras inte:</strong> totalt {speedText} s.
                  SG4 fördelar tiden annorlunda mellan baksving och nedsving.
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-[#a8c7ed]">Allt kan justeras här utan att lämna träningsvyn.</p>
                <div className="mt-5">
                  <h3 className="text-[13px] font-bold">Träningspass</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => edit({ single: true })} className={pickClass(settings.single)}>En sving</button>
                    <button type="button" onClick={() => edit({ single: false })} className={pickClass(!settings.single)}>Repetera</button>
                  </div>
                  {!settings.single ? (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {([5, 10, 20, "unlimited"] as const).map((value) => (
                        <button type="button" key={value} onClick={() => edit({ count: value })}
                          className={pickClass(settings.count === value)}>
                          {value === "unlimited" ? "∞" : value}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1.5 text-[11px] text-[#acc4e5]">Start om</p>
                      <div className="grid grid-cols-3 gap-1">
                        {([3, 5, 10] as const).map((n) => (
                          <button type="button" key={n} onClick={() => edit({ delay: n })}
                            className={pickClass(settings.delay === n)}>{n}s</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] text-[#acc4e5]">Paus mellan</p>
                      <div className="grid grid-cols-3 gap-1">
                        {([3, 5, 8] as const).map((n) => (
                          <button type="button" key={n} disabled={settings.single}
                            onClick={() => edit({ rest: n })} className={pickClass(settings.rest === n)}>{n}s</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-white/15 pt-4">
                  <h3 className="flex items-center gap-2 text-[13px] font-bold">
                    <AudioLines className="h-4 w-4" /> Ljud
                  </h3>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {SOUNDS.map((sound) => (
                      <button type="button" key={sound.id} aria-pressed={settings.sound === sound.id}
                        onClick={() => edit({ sound: sound.id })} className={pickClass(settings.sound === sound.id)}>
                        {sound.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <VolumeX className="h-4 w-4 shrink-0 text-[#9fbade]" />
                    <input type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
                      aria-label="Ljudvolym" disabled={settings.sound === "off"}
                      onChange={(ev) => edit({ volume: Number(ev.target.value) / 100 })}
                      className="w-full accent-blue-400 disabled:opacity-40" />
                    <Volume2 className="h-4 w-4 shrink-0 text-[#9fbade]" />
                    <button type="button" disabled={settings.sound === "off" || settings.volume === 0}
                      onClick={() => void preview()}
                      className="shrink-0 rounded-lg border border-white/25 px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40">
                      Testa
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-[13px] font-bold">
                      <Smartphone className="h-4 w-4" /> Haptik
                    </h3>
                    <p className="mt-1 text-[11px] text-[#a8c7ed]">
                      {hapticAvailable ? "Vibration vid start, vändning och träff." : "Stöds inte i den här webbläsaren."}
                    </p>
                  </div>
                  <button type="button" role="switch" aria-checked={hapticAvailable && settings.haptics}
                    aria-label="Aktivera haptik" disabled={!hapticAvailable}
                    onClick={() => edit({ haptics: !settings.haptics })}
                    className={"relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 " +
                      (hapticAvailable && settings.haptics ? "bg-blue-500" : "bg-white/20")}>
                    <span className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all " +
                      (hapticAvailable && settings.haptics ? "left-7" : "left-1")} />
                  </button>
                </div>
                {history.length ? (
                  <p className="mt-4 text-[11px] leading-relaxed text-[#829ec8]">
                    {history.length} tidigare pass sparade. Sekvenserna är uppspelade ljud, inte uppmätta golfslag.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
