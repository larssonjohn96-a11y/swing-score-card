import type { PuttingChallenge } from "@/lib/coach-challenges";

export function CoachChallengeCard({ challenge, left, total, feedback, onSkip, disabled, finalChallenge = false }: {
  challenge: PuttingChallenge | null; left: number; total: number; feedback: string;
  onSkip: () => void; disabled: boolean; finalChallenge?: boolean;
}) {
  const progress = challenge ? (challenge.distances.length - challenge.remaining) / challenge.distances.length : (total - left) / total;
  return <section aria-label="Coach Challenge" className={`relative mt-3 h-[164px] overflow-hidden rounded-3xl border p-4 transition-colors duration-500 ${challenge ? "sg4-challenge-gold border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 shadow-[0_0_26px_-10px_#f59e0b]" : "border-amber-100 bg-white"}`}>
    <style>{`
      @keyframes challengeReveal{0%{box-shadow:0 0 0 0 #fbbf2499;filter:brightness(1.3)}100%{box-shadow:0 0 26px -10px #f59e0b;filter:brightness(1)}}
      @keyframes challengeSparkle{0%{opacity:0;transform:translateY(12px) scale(.5)}40%{opacity:1}100%{opacity:0;transform:translateY(-30px) scale(1.2)}}
      .sg4-challenge-gold{animation:challengeReveal 900ms ease-out}
      .sg4-challenge-spark{animation:challengeSparkle 1400ms ease-out both}
      @media(prefers-reduced-motion:reduce){.sg4-challenge-gold,.sg4-challenge-spark{animation:none}.sg4-challenge-spark{display:none}}
    `}</style>
    {challenge && <div aria-hidden="true" className="pointer-events-none absolute inset-0">{[12,32,62,83].map((x,i) => <span key={x} className="sg4-challenge-spark absolute text-amber-500" style={{left:`${x}%`,top:"60%",animationDelay:`${i*100}ms`}}>✦</span>)}</div>}
    <div className="relative flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#fef3c7" strokeWidth="4"/><circle cx="24" cy="24" r="20" fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" strokeDasharray="125.66" strokeDashoffset={125.66*(1-progress)} className="transition-all duration-500"/></svg>
        <span className="absolute inset-0 flex items-center justify-center font-bold text-amber-700">{challenge || finalChallenge ? "✦" : left}</span>
      </div>
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">{challenge ? `Coach Challenge · Nivå ${challenge.level}` : "Alma · Din coach"}</p>
        <p className="mt-1 font-display text-xl leading-tight text-slate-950">{challenge ? challenge.title : finalChallenge ? "Sista utmaningen" : `Coach Challenge om ${left} hål`}</p>
        <p className="mt-1 line-clamp-4 text-xs text-slate-600">{challenge ? `${challenge.distances.length > 1 ? `Hål ${challenge.distances.length-challenge.remaining+1}/3 · ` : ""}${challenge.detail}` : feedback || "Spela vidare. Din nästa utmaning närmar sig."}</p>
      </div>
    </div>
    {challenge && <button type="button" disabled={disabled} onClick={onSkip} className="relative mt-2 text-xs text-amber-800 underline disabled:opacity-40">Hoppa över utmaningen</button>}
  </section>;
}
