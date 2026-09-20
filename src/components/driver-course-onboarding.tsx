import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Star, Flag } from "lucide-react";
const steps = [
  {
    title: "Gå till första hålet",
    text: "Jag är Alma! Sikta i mitten. Zonen är 20 m åt varje håll. Ett slag per hål.",
  },
  {
    title: "Registrera längd och sidled.",
    text: "Ange total längd och hur långt åt vänster eller höger bollen hamnade.",
  },
  {
    title: "Samla stjärnor. Höj ditt snitt.",
    text: "Samla 18 personliga stjärnor. Driverpoäng jämför dig med vänner. Paus efter tre hål.",
  },
];
export function DriverOnboarding({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-3xl bg-white p-5 text-slate-950">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
            aria-hidden="true"
          >
            <svg viewBox="0 0 48 48" className="h-12 w-12">
              <circle cx="24" cy="24" r="24" fill="#dbeafe" />
              <path d="M9 28Q5 6 24 6T39 30L33 37H14Z" fill="#573324" />
              <path d="M8 48Q10 31 24 32T40 48" fill="#2563eb" />
              <ellipse cx="24" cy="22" rx="11" ry="13" fill="#dba77f" />
              <path d="M12 20Q11 7 24 8Q38 8 36 20L28 12Q23 20 12 20" fill="#573324" />
              <circle cx="20" cy="23" r="1" fill="#42281d" />
              <circle cx="28" cy="23" r="1" fill="#42281d" />
              <path
                d="M21 28Q24 31 27 28"
                fill="none"
                stroke="#7c4232"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <p className="font-black text-blue-700">Alma</p>
            <p className="text-xs text-slate-500">Så spelar du · {step + 1} av 3</p>
          </div>
        </div>
        <div className="relative h-44 overflow-hidden rounded-2xl bg-emerald-50" aria-hidden="true">
          <svg viewBox="0 0 300 170" className="absolute inset-0 h-full w-full">
            <path
              d="M35 130 Q100 30 155 85 T265 35"
              fill="none"
              stroke="#bbf7d0"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d="M35 130 Q100 30 155 85 T265 35"
              fill="none"
              stroke="#86efac"
              strokeWidth="2"
              strokeDasharray="5 7"
            />
          </svg>
          <Flag className="absolute left-[42%] top-16 h-8 w-8 fill-yellow-400 text-yellow-500" />
          <Flag className="absolute right-5 top-5 h-8 w-8 fill-yellow-400 text-yellow-500" />
          <span
            className="absolute text-4xl transition-all duration-1000 motion-reduce:transition-none"
            style={{
              left: step === 2 ? "68%" : step === 1 ? "35%" : "8%",
              top: step === 2 ? "24%" : step === 1 ? "49%" : "65%",
            }}
          >
            <svg viewBox="0 0 32 38" className="h-12 w-10">
              <circle cx="13" cy="7" r="4" fill="#f4c7a1" />
              <path d="M8 5q1-6 8-2l3 3H8" fill="#2563eb" />
              <path d="M12 13l6 7-4 7-7-4 1-9z" fill="#2563eb" />
              <path
                d="M15 15l7 9M10 16l10 9"
                stroke="#f4c7a1"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M9 25l-3 10m8-9 2 9"
                stroke="#334155"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M22 24l7 12h-6" fill="none" stroke="#64748b" strokeWidth="2" />
            </svg>
          </span>
          {step === 1 && (
            <span className="chip-demo-ball absolute left-[24%] top-[63%] h-3 w-3 rounded-full border border-slate-200 bg-white shadow-sm" />
          )}
          {step === 2 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className="chip-demo-star h-8 w-8 fill-amber-400 text-amber-500"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
          )}
        </div>
        <style>{`@keyframes chipDemoBall{0%{transform:translate(0,0)}60%,100%{transform:translate(55px,-20px)}}@keyframes chipDemoStar{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}.chip-demo-ball{animation:chipDemoBall 1.6s ease-out 2}.chip-demo-star{animation:chipDemoStar .45s ease-out both}@media(prefers-reduced-motion:reduce){.chip-demo-ball,.chip-demo-star{animation:none}}`}</style>
        <DialogTitle className="text-xl font-black">{steps[step].title}</DialogTitle>
        <DialogDescription className="text-base text-slate-600">
          {steps[step].text}
        </DialogDescription>
        <button
          className="min-h-12 rounded-2xl bg-blue-600 px-4 font-bold text-white"
          onClick={() => (step === 2 ? onDone() : setStep((s) => s + 1))}
        >
          {step === 2 ? "Spela första hålet" : "Nästa"}
        </button>
        {step < 2 && (
          <button className="min-h-10 text-sm text-slate-500" onClick={onDone}>
            Hoppa över och spela
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
