import { ChipCelebration } from "./chip-celebration";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trophy } from "lucide-react";
export function CourseCelebration({
  name,
  tone,
  onClose,
}: {
  name: string;
  tone: "blue" | "red";
  onClose: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    button.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-victory-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          e.preventDefault();
          button.current?.focus();
        }
      }}
      className={`fixed inset-0 z-[200] overflow-y-auto text-white ${tone === "blue" ? "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950" : "bg-gradient-to-br from-red-500 via-red-700 to-red-950"}`}
    >
      <ChipCelebration />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <Trophy className="h-20 w-20 text-yellow-300 drop-shadow-lg" />
        <p className="text-sm font-black uppercase tracking-[.25em]">Seger!</p>
        <h1
          id="course-victory-title"
          className="break-words font-sans text-5xl font-extrabold leading-tight"
        >
          {name} vinner!
        </h1>
        <button
          ref={button}
          onClick={onClose}
          className="mt-5 min-h-12 rounded-full bg-white px-8 py-3 font-bold text-slate-950"
        >
          Fortsätt till resultatet →
        </button>
      </div>
    </div>,
    document.body,
  );
}
export function CoursePressure({ text }: { text: string }) {
  return (
    <aside
      role="status"
      className="course-pressure rounded-2xl border border-yellow-400 bg-gradient-to-r from-yellow-300 to-amber-300 px-3 py-2 text-center text-slate-950"
    >
      <p className="text-[10px] font-black uppercase tracking-[.16em]">Pressläge · Nu gäller det</p>
      <p className="mt-1 text-xs font-bold leading-tight">{text}</p>
    </aside>
  );
}
export function CourseCompactStyles() {
  return (
    <style>{`
.course-readable,.course-readable *{letter-spacing:normal}
.course-readable .font-display{font-family:var(--font-sans);font-weight:700;text-transform:none}
.course-readable .uppercase{text-transform:none}
.course-readable .course-stroke-header h2{font-size:24px}
@keyframes coursePressurePulse{0%,100%{box-shadow:0 0 0 0 #fbbf2400}50%{box-shadow:0 0 0 3px #fbbf2430}}
.course-pressure{animation:coursePressurePulse 1.8s ease-in-out 2}
@media(prefers-reduced-motion:reduce){.course-pressure{animation:none}}
.course-compact > header{padding-top:6px;padding-bottom:6px}
.course-compact > main{padding-top:8px}
.course-compact > main > :not([hidden]) ~ :not([hidden]){margin-top:8px}
.course-compact .course-stroke{padding:10px 12px;border-radius:22px}
.course-compact .course-stroke-header{margin-bottom:6px}
.course-compact .course-stroke-header h2{font-size:24px;line-height:1.1}
.course-compact .course-stroke-header p{padding-top:0;font-size:24px;line-height:1.2}
.course-compact .course-stroke-grid{gap:5px}
.course-compact .course-stroke-choice{min-height:42px;padding:2px}
.course-compact .course-stroke-choice > span:first-child{font-size:23px;line-height:1.1}
.course-compact .course-stroke-choice > span:nth-child(2){display:none}
.course-compact .course-match-top{min-height:52px}
.course-compact .course-match-top > div{padding-top:6px;padding-bottom:6px}
.course-compact .course-match-progress{padding-top:5px;padding-bottom:5px}
.course-compact .course-input-heading{font-size:30px;line-height:1.15;margin:0}
.course-compact .course-hole-heading{padding:0;margin-top:6px!important;margin-bottom:0!important}
.course-compact .course-hole-heading p{margin-top:4px}
.course-compact .course-input-hint{display:none}
.course-compact .course-extra{padding:6px 10px;font-size:12px}
.course-compact .course-bot-length{font-size:12px}
.course-compact .course-bot-length select{min-height:40px}
.course-compact .course-bot-length > span:last-child{display:none}
.course-compact .course-scorecard{padding:8px 12px}
@media(max-height:700px){.course-compact > header{padding-top:2px;padding-bottom:2px}.course-compact > main{padding-top:4px}.course-compact > main > :not([hidden]) ~ :not([hidden]){margin-top:6px}.course-compact .course-stroke{padding:8px 10px}.course-compact .course-stroke-choice{min-height:40px}.course-compact .course-match-top{min-height:48px}}
@media(min-height:800px){.course-compact .course-stroke-choice{min-height:48px}.course-compact .course-stroke{padding:14px}.course-compact > main > :not([hidden]) ~ :not([hidden]){margin-top:12px}}
`}</style>
  );
}
