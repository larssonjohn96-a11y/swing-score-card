from pathlib import Path
import re

p = Path('src/routes/match.tsx')
t = p.read_text()

# 1) More breathing room in putting scoring, larger player names, larger pressure banner.
t = t.replace('rounded-[18px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-4 py-2 text-center', 'rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center')
t = t.replace('text-[9px] font-black uppercase tracking-[0.2em] text-slate-950">Pressläge · Nu gäller det', 'text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det')
t = t.replace('mt-0.5 text-[10px] font-bold leading-snug text-slate-800">{pressureNotice}', 'mt-1 text-xs font-bold leading-snug text-slate-800">{pressureNotice}')

# Put a little more vertical separation between the challenge, registration title and player cards.
t = t.replace('{isPutting ? <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}>', '{isPutting ? <section className={tight ? "mt-2" : compact ? "mt-3" : "mt-5"}>', 1)
t = t.replace('<div className={`space-y-2 ${tight ? "mt-1" : compact ? "mt-2" : "mt-3"}`}>{([[blueLabel, blueStrokes, setBlueStrokes, "blue"], [redLabel, redStrokes, setRedStrokes, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[24px] border ${tight ? "p-1.5" : compact ? "p-2" : "p-3"}', '<div className={`space-y-3 ${tight ? "mt-2" : compact ? "mt-3" : "mt-4"}`}>{([[blueLabel, blueStrokes, setBlueStrokes, "blue"], [redLabel, redStrokes, setRedStrokes, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[26px] border ${tight ? "p-2.5" : compact ? "p-3" : "p-4"}', 1)
t = t.replace('max-w-[70%] truncate text-xs font-bold ${tone === "blue" ? "text-blue-700" : "text-red-700"}', 'max-w-[68%] truncate font-display text-xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}', 1)
t = t.replace('font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}', 'font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}', 1)
t = t.replace('<div className="mt-2 grid grid-cols-4 gap-2">{([1, 2, 3, 4] as const).map((strokes)', '<div className="mt-3 grid grid-cols-4 gap-2.5">{([1, 2, 3, 4] as const).map((strokes)', 1)

# 2) Sudden death celebration state.
state_marker = '  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);\n'
if state_marker in t and 'sdWinnerCelebration' not in t:
    t = t.replace(state_marker, state_marker + '  const [sdWinnerCelebration, setSdWinnerCelebration] = useState<"blue" | "red" | null>(null);\n', 1)

# 3) Winner now gets a full-screen celebration before result page.
old_fn = '''  function recordSuddenDeath(outcome: "blue" | "red" | "tie") {
    if (outcome === "tie") {
      setSdMessage("Båda satte den · vi fortsätter");
      window.setTimeout(() => {
        setSuddenDeathRound((r) => r + 1);
        setSdMessage("");
      }, 900);
      return;
    }
    setFinalText(`${outcome === "blue" ? blueLabel : redLabel} vinner i sudden death · närmast hålet`);
    setStep("result");
  }
'''
new_fn = '''  function recordSuddenDeath(outcome: "blue" | "red" | "tie") {
    if (outcome === "tie") {
      setSdMessage("Båda satte den · vi fortsätter");
      window.setTimeout(() => {
        setSuddenDeathRound((r) => r + 1);
        setSdMessage("");
      }, 900);
      return;
    }
    setFinalText(`${outcome === "blue" ? blueLabel : redLabel} vinner i sudden death · närmast hålet`);
    setSdWinnerCelebration(outcome);
    window.setTimeout(() => {
      setSdWinnerCelebration(null);
      setStep("result");
    }, 2300);
  }
'''
if old_fn not in t:
    raise SystemExit('recordSuddenDeath marker missing')
t = t.replace(old_fn, new_fn, 1)

# 4) Replace the whole sudden-death UI with a persistent split blue/red arena.
pattern = re.compile(r'    \{step === "sudden-death" \? <>.*?          </> : null\}\n\n    \{step === "result"', re.S)
replacement = '''    {step === "sudden-death" ? <>
      <style>{`@keyframes sdBlueRush{0%{transform:translateX(-120%)}42%{transform:translateX(5%)}56%{transform:translateX(-2.5%)}68%{transform:translateX(1.3%)}100%{transform:translateX(0)}}@keyframes sdRedRush{0%{transform:translateX(120%)}42%{transform:translateX(-5%)}56%{transform:translateX(2.5%)}68%{transform:translateX(-1.3%)}100%{transform:translateX(0)}}@keyframes sdImpact{0%,34%{opacity:0;transform:scale(.15) rotate(0deg)}47%{opacity:1;transform:scale(1.8) rotate(28deg)}62%{opacity:.85;transform:scale(.9) rotate(-12deg)}100%{opacity:.4;transform:scale(1.15) rotate(10deg)}}@keyframes sdHeroIn{0%,50%{opacity:0;transform:translateY(18px) scale(.92)}74%{opacity:1;transform:translateY(0) scale(1.035)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes sdPageIn{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}@keyframes sdConfettiA{0%{opacity:0;transform:translateY(-20vh) rotate(0deg)}15%{opacity:1}100%{opacity:0;transform:translateY(115vh) rotate(720deg)}}@keyframes sdConfettiB{0%{opacity:0;transform:translateY(-25vh) rotate(0deg)}12%{opacity:1}100%{opacity:0;transform:translateY(110vh) rotate(-680deg)}}@keyframes sdFirework{0%{opacity:0;transform:scale(.25)}28%{opacity:1;transform:scale(1.25)}60%{opacity:.95;transform:scale(.95)}100%{opacity:0;transform:scale(1.6)}}@keyframes sdWinnerTakeover{0%{opacity:0;clip-path:circle(4% at 50% 50%)}45%{opacity:1;clip-path:circle(55% at 50% 50%)}100%{opacity:1;clip-path:circle(110% at 50% 50%)}}`}</style>

      <div className="fixed inset-0 z-40 overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-red-500 via-red-600 to-red-800" />
        <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 bg-white/30 shadow-[0_0_24px_rgba(255,255,255,.45)]" />

        <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-[max(22px,env(safe-area-inset-top))]" style={{animation:'sdPageIn 500ms ease-out both'}}>
          <div className="flex items-center justify-between pt-3">
            <span className="max-w-[42%] truncate font-display text-2xl text-white">{blueLabel}</span>
            <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/85">Avgörande {suddenDeathRound}</span>
            <span className="max-w-[42%] truncate text-right font-display text-2xl text-white">{redLabel}</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-7 text-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-white/10 blur-2xl" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.42em] text-white/75">AVGÖRANDE</p>
              <h1 className="relative mt-2 font-display text-6xl leading-[.88] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,.28)]">SUDDEN<br/>DEATH</h1>
            </div>
            <div className="mt-7 rounded-[28px] border border-white/25 bg-black/20 px-8 py-5 shadow-2xl backdrop-blur-xl">
              <p className="font-display text-5xl leading-none text-white">11 M</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white/75">från hålet</p>
              <p className="mt-4 text-sm font-bold text-white">Närmast hålet vinner matchen</p>
            </div>
          </div>

          <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Vem vann?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => recordSuddenDeath("blue")} className="min-h-24 rounded-[26px] border border-white/35 bg-blue-950/30 px-3 py-4 text-center shadow-xl backdrop-blur-xl transition active:scale-[.97]">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-blue-100">Närmast</span>
                <span className="mt-2 block truncate font-display text-2xl text-white">{blueLabel}</span>
              </button>
              <button onClick={() => recordSuddenDeath("red")} className="min-h-24 rounded-[26px] border border-white/35 bg-red-950/30 px-3 py-4 text-center shadow-xl backdrop-blur-xl transition active:scale-[.97]">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-red-100">Närmast</span>
                <span className="mt-2 block truncate font-display text-2xl text-white">{redLabel}</span>
              </button>
            </div>
            <button onClick={() => recordSuddenDeath("tie")} className="mt-3 w-full rounded-[22px] border border-white/30 bg-black/20 px-4 py-3 text-center backdrop-blur-xl transition active:scale-[.98]">
              <span className="font-display text-xl text-white">Lika</span>
              <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/65">Båda satte den</span>
            </button>
            {sdMessage ? <div className="mt-3 rounded-2xl border border-white/25 bg-black/25 p-3 text-center text-sm font-black text-white backdrop-blur-xl">{sdMessage}</div> : null}
          </div>
        </div>
      </div>

      {showSuddenDeathIntro ? <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950">
        <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500" style={{animation:'sdBlueRush 1.55s cubic-bezier(.18,.82,.24,1) both',clipPath:'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)'}} />
        <div className="absolute inset-y-0 right-0 w-[56%] bg-gradient-to-l from-red-800 via-red-600 to-red-500" style={{animation:'sdRedRush 1.55s cubic-bezier(.18,.82,.24,1) both',clipPath:'polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)'}} />
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-yellow-200" style={{animation:'sdImpact 1.95s ease-out both'}}><span className="block text-8xl drop-shadow-[0_0_28px_rgba(253,224,71,.95)]">✦</span><span className="absolute -left-8 -top-3 text-2xl">✦</span><span className="absolute -right-8 top-4 text-xl">✦</span><span className="absolute left-2 -bottom-7 text-lg">✦</span></div>
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center" style={{animation:'sdHeroIn 2.2s ease-out both'}}><div className="rounded-[34px] border border-white/25 bg-black/30 px-8 py-7 shadow-2xl backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/75">AVGÖRANDE</p><h1 className="mt-2 font-display text-6xl leading-[.88] text-white">SUDDEN<br/>DEATH</h1><p className="mt-5 text-sm font-black text-white">11 meter · närmast hålet vinner</p></div></div>
      </div> : null}

      {sdWinnerCelebration ? <div className={`fixed inset-0 z-[60] overflow-hidden ${sdWinnerCelebration === "blue" ? "bg-blue-600" : "bg-red-600"}`} style={{animation:'sdWinnerTakeover 720ms cubic-bezier(.2,.8,.2,1) both'}}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.22),transparent_48%)]" />
        {['8%','19%','31%','45%','58%','70%','83%','92%'].map((left, i) => <span key={`c-${i}`} className="absolute top-[-10%] text-3xl" style={{left, animation:`${i % 2 ? 'sdConfettiA' : 'sdConfettiB'} ${1.25 + (i % 3) * .18}s ${i * .06}s ease-in both`}}>{i % 3 === 0 ? '🎉' : i % 3 === 1 ? '✦' : '🎊'}</span>)}
        <span className="absolute left-[10%] top-[18%] text-7xl" style={{animation:'sdFirework 1.25s .2s ease-out both'}}>🎇</span>
        <span className="absolute right-[8%] top-[24%] text-6xl" style={{animation:'sdFirework 1.25s .45s ease-out both'}}>🎆</span>
        <span className="absolute left-[18%] bottom-[16%] text-6xl" style={{animation:'sdFirework 1.25s .65s ease-out both'}}>🎆</span>
        <span className="absolute right-[15%] bottom-[14%] text-7xl" style={{animation:'sdFirework 1.25s .8s ease-out both'}}>🎇</span>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-white/75">SUDDEN DEATH</p>
          <p className="mt-4 font-display text-6xl leading-none">{sdWinnerCelebration === "blue" ? blueLabel : redLabel}</p>
          <p className="mt-3 font-display text-4xl">VINNER</p>
          <p className="mt-5 text-sm font-bold text-white/85">Närmast hålet · matchen avgjord</p>
        </div>
      </div> : null}
    </> : null}

    {step === "result"'''
t, n = pattern.subn(replacement, t, count=1)
if n != 1:
    raise SystemExit('sudden death UI block not found')

p.write_text(t)
