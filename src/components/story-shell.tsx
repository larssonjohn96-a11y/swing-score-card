import { useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";

/**
 * Generisk story-motor (Instagram Stories-stil): progressbar, kryssknapp,
 * osynliga tryckzoner vänster/höger, swipe-stöd. Innehållet i varje slide
 * är helt upp till anroparen (renderSlide) – samma skal används av både
 * startsidans "Hur fungerar SG4?" och varje tests "Så fungerar testet".
 */
export function StoryShell({
  slideCount,
  renderSlide,
  onClose,
}: {
  slideCount: number;
  renderSlide: (index: number) => React.ReactNode;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function next() {
    if (index + 1 >= slideCount) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
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

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0b1710] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Presentation"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex gap-1.5 px-4 pt-4">
          {Array.from({ length: slideCount }).map((_, i) => (
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
          className="absolute right-4 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div key={index} className="relative flex flex-1 flex-col overflow-hidden px-6 pb-8 pt-10">
          {renderSlide(index)}
          {index === 0 && slideCount > 1 && (
            <span
              className="animate-in fade-in pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 duration-500"
              style={{ animationDelay: "900ms", animationFillMode: "both" }}
            >
              <ChevronRight className="h-7 w-7 animate-pulse" strokeWidth={1.5} />
            </span>
          )}
        </div>
      </div>

      {/* Osynliga tryckzoner: vänster = föregående, höger = nästa. top-20 lämnar
          gott om marginal under kryssknappen så de aldrig kan täcka den. */}
      <div className="pointer-events-none absolute inset-0 top-20 flex">
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
