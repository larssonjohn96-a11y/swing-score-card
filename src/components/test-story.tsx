import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Info } from "lucide-react";
import { StoryShell } from "@/components/story-shell";

/* -------------------------------------------------------------------------
 * Config – varje test tillhandahåller bara data, inte egen story-UI.
 * ---------------------------------------------------------------------- */

export type TestStoryConfig = {
  /** unikt per test, används för "sedd"-flaggan i localStorage */
  testId: string;
  what: { title: string; description: string; tags?: string[] };
  how: { title: string; steps: string[]; caption?: string };
  register: { title: string; description: string; options: string[] };
  level: {
    title: string;
    metricLabel: string;
    exampleValue: string;
    progression?: string[];
    caption: string;
  };
  ctaLabel: string;
  /** route CTA-knappen navigerar till efter att storyn stängts */
  ctaTo: string;
};

const SEEN_KEY_PREFIX = "sg4-test-story-seen:";

function hasSeen(testId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SEEN_KEY_PREFIX + testId) === "1";
}

function markSeen(testId: string) {
  window.localStorage.setItem(SEEN_KEY_PREFIX + testId, "1");
}

/* -------------------------------------------------------------------------
 * Trigger-rad – mer framträdande första gången, sedan diskret för gott.
 * ---------------------------------------------------------------------- */

export function TestHowItWorksLink({ config }: { config: TestStoryConfig }) {
  const [open, setOpen] = useState(false);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => setFirstTime(!hasSeen(config.testId)), [config.testId]);

  function handleOpen() {
    setOpen(true);
    markSeen(config.testId);
    setFirstTime(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">
            {firstTime ? "Första gången?" : "Så fungerar testet"}
          </span>
          <span className="block text-xs text-muted-foreground">Se hur testet fungerar</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && <TestStoryModal config={config} onClose={() => setOpen(false)} />}
    </>
  );
}

function TestStoryModal({ config, onClose }: { config: TestStoryConfig; onClose: () => void }) {
  const navigate = useNavigate();

  function handleCta() {
    markSeen(config.testId);
    onClose();
    navigate({ to: config.ctaTo });
  }

  const slides = [
    () => <WhatSlide {...config.what} />,
    () => <HowSlide {...config.how} />,
    () => <RegisterSlide {...config.register} />,
    () => <LevelSlide {...config.level} ctaLabel={config.ctaLabel} onCta={handleCta} />,
  ];

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

/* -------------------------------------------------------------------------
 * Generiska slide-mallar – samma fyra för alla sju tester.
 * ---------------------------------------------------------------------- */

function SlideEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-in fade-in slide-in-from-bottom-4 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary duration-500">
      {children}
    </p>
  );
}

function WhatSlide({ title, description, tags }: TestStoryConfig["what"]) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <SlideEyebrow>Vad testar du?</SlideEyebrow>
      <h2 className="animate-in fade-in slide-in-from-bottom-4 mt-3 font-[family-name:var(--font-display)] text-3xl leading-[1.05] delay-100 duration-500">
        {title}
      </h2>
      <p className="animate-in fade-in slide-in-from-bottom-4 mt-4 max-w-xs text-base leading-relaxed text-white/70 delay-200 duration-500">
        {description}
      </p>
      {tags && tags.length > 0 && (
        <div className="animate-in fade-in zoom-in-95 mt-6 flex flex-wrap justify-center gap-1.5 delay-300 duration-500">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HowSlide({ title, steps, caption }: TestStoryConfig["how"]) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <SlideEyebrow>Så går det till</SlideEyebrow>
      <h2 className="animate-in fade-in slide-in-from-bottom-4 mt-3 font-[family-name:var(--font-display)] text-3xl leading-[1.05] delay-100 duration-500">
        {title}
      </h2>

      <div className="animate-in fade-in zoom-in-95 mt-8 flex flex-col items-center gap-2 delay-200 duration-500">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <span className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-2.5 font-[family-name:var(--font-display)] text-lg text-primary">
              {step}
            </span>
            {i < steps.length - 1 && <span className="text-white/30">↓</span>}
          </div>
        ))}
      </div>

      {caption && (
        <p
          className="animate-in fade-in mt-6 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
          style={{ animationDelay: "600ms", animationFillMode: "both" }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

function RegisterSlide({ title, description, options }: TestStoryConfig["register"]) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <SlideEyebrow>Registrera resultatet</SlideEyebrow>
      <h2 className="animate-in fade-in slide-in-from-bottom-4 mt-3 font-[family-name:var(--font-display)] text-2xl leading-[1.1] delay-100 duration-500">
        {title}
      </h2>
      <p className="animate-in fade-in slide-in-from-bottom-4 mt-3 max-w-xs text-sm leading-relaxed text-white/70 delay-200 duration-500">
        {description}
      </p>

      <div className="animate-in fade-in zoom-in-95 mt-6 grid w-full max-w-xs grid-cols-2 gap-2 delay-300 duration-500">
        {options.map((o) => (
          <span
            key={o}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold leading-tight text-white/85"
          >
            {o}
          </span>
        ))}
      </div>

      <p
        className="animate-in fade-in mt-6 text-sm font-medium text-white/60 duration-500"
        style={{ animationDelay: "700ms", animationFillMode: "both" }}
      >
        Du vet exakt vad du ska göra efter varje slag.
      </p>
    </div>
  );
}

function LevelSlide({
  title,
  metricLabel,
  exampleValue,
  progression,
  caption,
  ctaLabel,
  onCta,
}: TestStoryConfig["level"] & { ctaLabel: string; onCta: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <SlideEyebrow>Få din nivå</SlideEyebrow>
      <h2 className="animate-in fade-in slide-in-from-bottom-4 mt-3 font-[family-name:var(--font-display)] text-2xl leading-[1.1] delay-100 duration-500">
        {title}
      </h2>

      <div className="animate-in fade-in zoom-in-95 mt-6 flex flex-col items-center delay-200 duration-500">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          {metricLabel}
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {exampleValue}
        </p>
      </div>

      {progression && progression.length > 0 && (
        <p
          className="animate-in fade-in mt-4 flex items-center gap-2 text-sm text-white/50 duration-500"
          style={{ animationDelay: "450ms", animationFillMode: "both" }}
        >
          {progression.map((v, i) => (
            <span key={i} className="flex items-center gap-2">
              {v}
              {i < progression.length - 1 && <span className="text-white/25">→</span>}
            </span>
          ))}
        </p>
      )}

      <p
        className="animate-in fade-in mt-4 max-w-xs text-sm leading-relaxed text-white/70 duration-500"
        style={{ animationDelay: "600ms", animationFillMode: "both" }}
      >
        {caption}
      </p>

      <button
        type="button"
        onClick={onCta}
        className="animate-in fade-in slide-in-from-bottom-2 mt-8 flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-[family-name:var(--font-display)] text-xl text-primary-foreground duration-500"
        style={{ animationDelay: "800ms", animationFillMode: "both" }}
      >
        {ctaLabel}
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
