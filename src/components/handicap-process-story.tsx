import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ChevronLeft, ChevronRight, Play, X } from "lucide-react";

const STEPS = [
  { title: "Testa ditt spel", text: "Börja med HCP-testerna för att kartlägga din nivå i varje kategori.", image: "/Off_the_tee.png", label: "Testa" },
  { title: "Upptäck styrkor och svagheter", text: "Se vilka delar av ditt spel som ligger före och efter i spindeldiagrammet.", image: "/Approach_shot.png", label: "Förstå" },
  { title: "Välj vad du ska förbättra först", text: "Välj ett fokus utifrån analysen och sätt ett tydligt nästa mål.", image: "/Putting_1.png", label: "Fokusera" },
  { title: "Jobba på ditt fokus", text: "Öva själv, spela eller ta hjälp av din tränare. Du väljer hur du utvecklar ditt spel.", image: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png", label: "Förbättra" },
  { title: "Testa igen. Se din utveckling.", text: "Jämför med tidigare resultat. Behåll ditt fokus eller välj nästa. Följ också om förbättringen märks på banan.", image: "/Approach_shot.png", label: "Följ upp" },
];

export function HandicapProcessStory() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);
  const current = STEPS[step];
  const move = (delta: number) => setStep((value) => Math.max(0, Math.min(STEPS.length - 1, value + delta)));

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (value) setStep(0); }}>
      <section aria-labelledby="handicap-process-heading" className="mb-7 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 text-slate-950">
        <h2 id="handicap-process-heading" className="text-[26px] font-black leading-tight tracking-tight">Hur sänker jag mitt HCP?</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Börja med HCP-testerna. Hitta ditt fokus och följ din utveckling – steg för steg.</p>
        <Dialog.Trigger asChild>
          <button type="button" className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-blue-100 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-[3px] border-blue-600 p-0.5"><img src="/Off_the_tee.png" alt="" className="h-full w-full rounded-full object-cover"/><span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20"><Play className="h-5 w-5 fill-white text-white" aria-hidden="true"/></span></span>
            <span className="flex-1"><strong className="block text-base">Så fungerar det</strong><span className="mt-0.5 block text-xs text-slate-500">5 korta steg · börja med ett test</span></span>
            <ChevronRight className="h-5 w-5 text-blue-600" aria-hidden="true"/>
          </button>
        </Dialog.Trigger>
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[240] bg-black/80" />
        <Dialog.Content
          onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
          onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
          onTouchEnd={(event) => { if (touchStart.current !== null) { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1); } touchStart.current = null; }}
          className="fixed inset-0 z-[250] mx-auto flex h-dvh w-full max-w-lg flex-col overflow-y-auto bg-white text-slate-950 outline-none sm:inset-y-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl"
        >
          <div className="shrink-0 bg-slate-950 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] text-white">
            <div className="flex gap-1.5" aria-label={`Steg ${step + 1} av 5`}>
              {STEPS.map((item, index) => <button key={item.label} type="button" onClick={() => setStep(index)} aria-label={`Steg ${index + 1}: ${item.label}`} aria-current={step === index ? "step" : undefined} className="flex h-6 flex-1 items-center"><span className={`h-1 w-full rounded-full ${index <= step ? "bg-white" : "bg-white/30"}`}/></button>)}
            </div>
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">Hur sänker jag mitt HCP?</p><Dialog.Close aria-label="Stäng guiden" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><X className="h-6 w-6"/></Dialog.Close></div>
          </div>
          <div className="relative mx-4 mt-4 min-h-[120px] flex-1 overflow-hidden rounded-2xl bg-slate-100"><img src={current.image} alt="" className="absolute inset-0 h-full w-full object-cover"/></div>
          <div className="shrink-0 px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5" aria-live="polite">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">Steg {step + 1} av 5 · {current.label}</p>
            <Dialog.Title className="mt-2 text-[30px] font-black leading-tight">{current.title}</Dialog.Title>
            <Dialog.Description className="mt-3 text-lg leading-relaxed text-slate-600">{current.text}</Dialog.Description>
            {(step === 0 || step === 4) && <Link to="/spela-runda" onClick={() => setOpen(false)} className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">{step === 0 ? "Gör HCP-tester" : "Testa igen"}<ArrowRight className="h-5 w-5" aria-hidden="true"/></Link>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" disabled={step === 0} onClick={() => move(-1)} aria-label="Föregående steg" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-5 w-5"/></button>
              {step < 4 ? <button type="button" onClick={() => move(1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 font-bold">Nästa steg<ChevronRight className="h-5 w-5"/></button> : <Dialog.Close className="min-h-12 rounded-xl bg-slate-100 px-4 font-bold">Till min analys</Dialog.Close>}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
