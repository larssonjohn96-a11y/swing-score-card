import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Info } from "lucide-react";
import { StoryShell } from "@/components/story-shell";

/**
 * Approach-pilotens egen "Så fungerar testet"-story. Medvetet INTE byggd på
 * det generiska TestStoryConfig/WhatSlide-systemet (test-story.tsx) – den
 * här ska vara mycket mer bildbaserad, en slide = en sak. Om piloten faller
 * väl ut kan mönstret återanvändas för de andra testerna senare, men det är
 * inget den här implementationen gör.
 */
export function ApproachStoryLink() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">Första gången?</span>
          <span className="block text-xs text-muted-foreground">Se hur inspelstestet fungerar</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && <ApproachStoryModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ApproachStoryModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  function handleCta() {
    onClose();
    navigate({ to: "/precision" });
  }

  const slides = [Slide1, Slide2, Slide3, () => <Slide4 onCta={handleCta} />];

  return (
    <StoryShell
      slideCount={slides.length}
      onClose={onClose}
      renderSlide={(i) => {
        const Slide = slides[i];
        return <Slide />;
      }}
    />
  );
}

function SlideShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-xs duration-500">{children}</div>
      <h2 className="animate-in fade-in slide-in-from-bottom-2 mt-8 font-[family-name:var(--font-display)] text-2xl leading-tight delay-200 duration-500">
        {title}
      </h2>
      <p
        className="animate-in fade-in slide-in-from-bottom-2 mt-2 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "350ms", animationFillMode: "both" }}
      >
        {body}
      </p>
    </div>
  );
}

/* Slide 1 — SLÅ MOT MÅLET: en boll flyger mot green. */
function Slide1() {
  return (
    <SlideShell title="Slå mot målet" body="Du slår inspel mot flaggan från olika avstånd.">
      <svg viewBox="0 0 260 160" className="w-full">
        <ellipse cx="190" cy="80" rx="55" ry="36" className="fill-primary/20" />
        <ellipse cx="190" cy="80" rx="30" ry="20" className="fill-primary/35" />
        <line
          x1="190"
          y1="80"
          x2="190"
          y2="40"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        <path d="M190 40 L208 46 L190 52 Z" className="fill-flag" />
        <circle cx="190" cy="80" r="3" fill="white" />
        <circle cx="30" cy="140" r="4" fill="white" fillOpacity="0.5" />
        <path
          d="M30 140 Q 110 30 190 80"
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <circle r="5" className="fill-primary">
          <animateMotion
            path="M30 140 Q 110 30 190 80"
            dur="1.6s"
            repeatCount="indefinite"
            keyPoints="0;1;1"
            keyTimes="0;0.7;1"
            calcMode="linear"
          />
        </circle>
      </svg>
    </SlideShell>
  );
}

/* Slide 2 — REGISTRERA SLAGET: green + flagga + en landningspunkt. */
function Slide2() {
  return (
    <SlideShell
      title="Registrera slaget"
      body="Efter varje slag registrerar du var bollen landade."
    >
      <svg viewBox="0 0 260 160" className="w-full">
        <ellipse cx="130" cy="85" rx="70" ry="46" className="fill-primary/20" />
        <ellipse cx="130" cy="85" rx="44" ry="28" className="fill-primary/35" />
        <line
          x1="130"
          y1="85"
          x2="130"
          y2="40"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        <path d="M130 40 L150 47 L130 54 Z" className="fill-flag" />
        <circle cx="130" cy="85" r="3" fill="white" />
        <circle cx="158" cy="70" r="6" className="fill-primary animate-pulse" />
        <circle
          cx="158"
          cy="70"
          r="12"
          fill="none"
          className="stroke-primary"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
    </SlideShell>
  );
}

/* Slide 3 — BYGG DIN SPRIDNING: flera landningspunkter byggs upp. */
function Slide3() {
  const dots = [
    [158, 70, "0s"],
    [110, 96, "0.5s"],
    [140, 112, "1s"],
    [172, 100, "1.5s"],
    [122, 66, "2s"],
  ] as const;
  return (
    <SlideShell title="Bygg din spridning" body="Slag för slag får SG4 en bild av din precision.">
      <svg viewBox="0 0 260 160" className="w-full">
        <ellipse cx="130" cy="85" rx="70" ry="46" className="fill-primary/20" />
        <ellipse cx="130" cy="85" rx="44" ry="28" className="fill-primary/35" />
        <line
          x1="130"
          y1="85"
          x2="130"
          y2="40"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        <path d="M130 40 L150 47 L130 54 Z" className="fill-flag" />
        <circle cx="130" cy="85" r="3" fill="white" />
        {dots.map(([x, y, delay], i) => (
          <circle key={i} cx={x} cy={y} r="5" className="fill-primary" opacity="0">
            <animate
              attributeName="opacity"
              values="0;1;1"
              keyTimes="0;0.15;1"
              dur="3s"
              begin={delay}
              fill="freeze"
            />
          </circle>
        ))}
      </svg>
    </SlideShell>
  );
}

/* Slide 4 — FÅ DIN NIVÅ: spridningen övergår i ett HCP-resultat. */
function Slide4({ onCta }: { onCta: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-xs duration-500">
        <svg viewBox="0 0 260 160" className="w-full">
          <ellipse cx="130" cy="85" rx="70" ry="46" className="fill-primary/10" />
          <text
            x="130"
            y="80"
            textAnchor="middle"
            className="fill-white font-[family-name:var(--font-display)]"
            fontSize="34"
          >
            HCP
          </text>
          <text
            x="130"
            y="120"
            textAnchor="middle"
            className="fill-primary font-[family-name:var(--font-display)]"
            fontSize="40"
          >
            7,4
          </text>
        </svg>
      </div>
      <h2 className="animate-in fade-in slide-in-from-bottom-2 mt-6 font-[family-name:var(--font-display)] text-2xl leading-tight delay-200 duration-500">
        Få din nivå
      </h2>
      <p
        className="animate-in fade-in slide-in-from-bottom-2 mt-2 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "350ms", animationFillMode: "both" }}
      >
        När testet är klart beräknar SG4 vilken nivå dina inspel håller.
      </p>

      <button
        type="button"
        onClick={onCta}
        className="animate-in fade-in slide-in-from-bottom-2 mt-8 flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-[family-name:var(--font-display)] text-xl text-primary-foreground duration-500"
        style={{ animationDelay: "550ms", animationFillMode: "both" }}
      >
        Starta inspelstest
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
