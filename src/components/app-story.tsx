import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  CircleDot,
  Flag,
  Info,
  Rocket,
  Target,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

const SLIDE_COUNT = 5;

/**
 * Kompakt inforuta på startsidan + fullscreen story-presentation (5 slides,
 * Instagram Stories-stil) som förklarar VARFÖR appen finns. Ren mock-data –
 * rör aldrig användarens riktiga resultat. Rutan finns alltid kvar så man
 * kan öppna presentationen igen när som helst.
 */
export function AppStoryLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
        Ny här? Se hur SG4 fungerar
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {open && <StoryModal onClose={() => setOpen(false)} />}
    </>
  );
}

function StoryModal({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function next() {
    if (index + 1 >= SLIDE_COUNT) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function handleCta() {
    onClose();
    navigate({ to: "/tester" });
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next();
    else prev();
  }

  const slides = [Slide1Test, Slide2KnowYourGame, Slide3Improve, Slide4Track, Slide5Compare];
  const ActiveSlide = slides[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0b1710] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Hur SG4 fungerar"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex gap-1.5 px-4 pt-4">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: i <= index ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Stäng"
        className="absolute right-4 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div key={index} className="relative flex flex-1 flex-col overflow-hidden px-6 pb-8 pt-10">
        <ActiveSlide onCta={handleCta} />
      </div>

      {/* Osynliga tryckzoner: vänster = föregående, höger = nästa */}
      <div className="pointer-events-none absolute inset-0 top-16 flex">
        <button
          type="button"
          onClick={prev}
          aria-label="Föregående"
          className="pointer-events-auto h-full w-1/3"
        />
        <div className="w-1/3" />
        <button
          type="button"
          onClick={next}
          aria-label="Nästa"
          className="pointer-events-auto h-full w-1/3"
        />
      </div>
    </div>
  );
}

type SlideProps = { onCta: () => void };

/* ---------------------------------------------------------------- Slide 1 */

const SLIDE1_CATEGORIES = [
  { label: "Off the Tee", icon: Rocket },
  { label: "Approach", icon: Target },
  { label: "Around the Green", icon: Flag },
  { label: "Putting", icon: CircleDot },
];

function Slide1Test() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="animate-in fade-in slide-in-from-bottom-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary duration-500">
        SG4
      </p>
      <h2 className="animate-in fade-in slide-in-from-bottom-4 mt-3 font-[family-name:var(--font-display)] text-5xl leading-[0.95] delay-100 duration-500">
        TESTA
        <br />
        DITT SPEL
      </h2>
      <p className="animate-in fade-in slide-in-from-bottom-4 mt-4 max-w-xs text-base leading-relaxed text-white/70 delay-200 duration-500">
        7 enkla tester utformade för att mäta det som faktiskt avgör din prestation på banan.
      </p>

      <div className="animate-in fade-in zoom-in-95 mt-8 grid w-full max-w-xs grid-cols-2 gap-2.5 delay-300 duration-500">
        {SLIDE1_CATEGORIES.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-3 py-4"
          >
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide">
              {label}
            </p>
          </div>
        ))}
      </div>

      <p className="animate-in fade-in mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/40 delay-500 duration-500">
        Samma tester. Varje gång.
      </p>

      <p
        className="animate-in fade-in mt-8 flex items-center gap-1.5 text-xs font-medium text-white/40 duration-500"
        style={{ animationDelay: "900ms", animationFillMode: "both" }}
      >
        Tryck höger för att fortsätta
        <ChevronRight className="h-3.5 w-3.5 animate-pulse" />
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 2 */

const SLIDE2_BREAKDOWN = [
  { label: "Off the Tee", hcp: 7 },
  { label: "Approach", hcp: 16 },
  { label: "Around the Green", hcp: 18 },
  { label: "Putting", hcp: 8 },
];

function Slide2KnowYourGame() {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="animate-in fade-in slide-in-from-bottom-4 text-center font-[family-name:var(--font-display)] text-3xl leading-[1.05] duration-500">
        ETT HCP BERÄTTAR
        <br />
        INTE HELA HISTORIEN
      </h2>

      <div className="mt-7 flex flex-1 flex-col items-center justify-center">
        <div className="animate-in fade-in zoom-in-95 flex flex-col items-center delay-150 duration-500">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Ditt HCP</p>
          <p className="font-[family-name:var(--font-display)] text-8xl leading-none text-white">
            12
          </p>
        </div>

        <div className="my-5 h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />

        <div className="w-full max-w-xs space-y-2">
          {SLIDE2_BREAKDOWN.map((c, i) => (
            <div
              key={c.label}
              className="animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 duration-500"
              style={{ animationDelay: `${450 + i * 130}ms`, animationFillMode: "both" }}
            >
              <span className="text-sm font-medium text-white/85">{c.label}</span>
              <span className="font-[family-name:var(--font-display)] text-xl text-primary">
                HCP {c.hcp}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p
        className="animate-in fade-in text-center text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "1050ms", animationFillMode: "both" }}
      >
        Se vilken HCP-nivå varje del av ditt spel motsvarar.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 3 */

const SLIDE3_RADAR = [
  { subject: "Off the Tee", spelare: 78 },
  { subject: "Approach", spelare: 58 },
  { subject: "Around Green", spelare: 40 },
  { subject: "Putting", spelare: 70 },
  { subject: "Totalt", spelare: 62 },
];

function Slide3Improve() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="animate-in fade-in slide-in-from-bottom-4 font-[family-name:var(--font-display)] text-3xl leading-[1.05] duration-500">
        VET VAD DU
        <br />
        SKA FÖRBÄTTRA
      </h2>

      <div className="animate-in fade-in zoom-in-95 mt-4 h-52 w-full max-w-xs delay-150 duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={SLIDE3_RADAR} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.15)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.55)" }}
            />
            <Radar
              dataKey="spelare"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div
        className="animate-in fade-in slide-in-from-bottom-2 mt-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3 duration-500"
        style={{ animationDelay: "500ms", animationFillMode: "both" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-destructive/80">
          Största utvecklingsområde
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl">
          Around the Green · HCP 18
        </p>
      </div>

      <p
        className="animate-in fade-in mt-5 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "650ms", animationFillMode: "both" }}
      >
        Se dina styrkor, hitta dina svagheter och fokusera träningen där den gör störst skillnad.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 4 */

const SLIDE4_POINTS = [16.2, 13.8, 11.4, 8.7];

function Slide4Track() {
  const w = 280;
  const h = 100;
  const min = Math.min(...SLIDE4_POINTS);
  const max = Math.max(...SLIDE4_POINTS);
  const xFor = (i: number) => (i / (SLIDE4_POINTS.length - 1)) * w;
  const yFor = (v: number) => h - ((v - min) / (max - min || 1)) * (h - 20) - 10;
  const path = SLIDE4_POINTS.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)} ${yFor(v)}`).join(" ");

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="animate-in fade-in slide-in-from-bottom-4 font-[family-name:var(--font-display)] text-3xl leading-[1.05] duration-500">
        SE ATT DU
        <br />
        BLIR BÄTTRE
      </h2>

      <p
        className="animate-in fade-in mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/40 duration-500"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        Approach HCP
      </p>

      <div
        className="animate-in fade-in zoom-in-95 mt-2 duration-700"
        style={{ animationDelay: "250ms", animationFillMode: "both" }}
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full max-w-xs">
          <path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {SLIDE4_POINTS.map((v, i) => (
            <circle key={i} cx={xFor(i)} cy={yFor(v)} r="4" className="fill-primary" />
          ))}
        </svg>
      </div>

      <div
        className="animate-in fade-in slide-in-from-bottom-2 flex items-baseline gap-2 duration-500"
        style={{ animationDelay: "550ms", animationFillMode: "both" }}
      >
        {SLIDE4_POINTS.map((v, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-lg text-white/70">
              {v}
            </span>
            {i < SLIDE4_POINTS.length - 1 && <span className="text-white/30">→</span>}
          </span>
        ))}
      </div>

      <p
        className="animate-in fade-in slide-in-from-bottom-2 mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 font-[family-name:var(--font-display)] text-lg text-primary duration-500"
        style={{ animationDelay: "700ms", animationFillMode: "both" }}
      >
        <TrendingDown className="h-4 w-4" />
        −7,5 HCP
      </p>

      <p
        className="animate-in fade-in mt-5 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "850ms", animationFillMode: "both" }}
      >
        Testa igen och följ hur ditt spel utvecklas över tid.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 5 */

function Slide5Compare({ onCta }: SlideProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="animate-in fade-in slide-in-from-bottom-4 font-[family-name:var(--font-display)] text-3xl leading-[1.05] duration-500">
        SE HUR DU
        <br />
        STÅR DIG
      </h2>

      <div
        className="animate-in fade-in zoom-in-95 mt-6 flex items-center gap-6 duration-500"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
            <Users className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </span>
          <p className="text-xs font-semibold">Du</p>
          <p className="font-[family-name:var(--font-display)] text-lg text-primary">HCP 10</p>
        </div>
        <span className="text-xl text-white/30">vs</span>
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10">
            <Users className="h-6 w-6 text-destructive" strokeWidth={1.5} />
          </span>
          <p className="text-xs font-semibold">Kompis</p>
          <p className="font-[family-name:var(--font-display)] text-lg text-destructive">HCP 15</p>
        </div>
      </div>

      <div
        className="animate-in fade-in slide-in-from-bottom-2 mt-5 flex flex-wrap justify-center gap-1.5 duration-500"
        style={{ animationDelay: "350ms", animationFillMode: "both" }}
      >
        {["0", "5", "10", "20", "30"].map((h) => (
          <span
            key={h}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70"
          >
            HCP {h}
          </span>
        ))}
      </div>

      <p
        className="animate-in fade-in mt-4 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "500ms", animationFillMode: "both" }}
      >
        Jämför ditt spel med kompisar, andra HCP-nivåer och profiler.
      </p>

      <div
        className="animate-in fade-in slide-in-from-bottom-2 mt-8 duration-700"
        style={{ animationDelay: "700ms", animationFillMode: "both" }}
      >
        <p className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide text-white">
          TEST. TRACK.
          <br />
          IMPROVE. COMPARE.
        </p>
      </div>

      <button
        type="button"
        onClick={onCta}
        className="animate-in fade-in slide-in-from-bottom-2 mt-6 flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-[family-name:var(--font-display)] text-xl text-primary-foreground duration-500"
        style={{ animationDelay: "900ms", animationFillMode: "both" }}
      >
        Gör ett test
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
