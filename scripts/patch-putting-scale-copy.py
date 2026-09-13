from pathlib import Path

# --- Friend / team match ---
p = Path('src/routes/match.tsx')
t = p.read_text()

repls = {
    'detail: `Samma position för båda · håla ut · färre puttar vinner hålet${suffix}`': 'detail: `Samma position · håla ut · färre puttar vinner${suffix}`',
    'className={`rounded-[32px] border text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${tight ? "mt-1.5 p-2" : compact ? "mt-2 p-3" : "mt-4 p-5"} ${isPutting || isShortGame || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}': 'className={`rounded-[32px] border text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${tight ? (isPutting ? "mt-1.5 p-3" : "mt-1.5 p-2") : compact ? (isPutting ? "mt-2 p-4" : "mt-2 p-3") : "mt-4 p-5"} ${isPutting || isShortGame || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}',
    '${compact ? (isShortGame ? "text-3xl" : "text-4xl") : isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}': '${isPutting ? (compact || tight ? "text-5xl" : "text-6xl") : compact ? (isShortGame ? "text-3xl" : "text-4xl") : isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}',
    'max-w-[68%] truncate font-display text-xl leading-none': 'max-w-[68%] truncate font-display text-[34px] leading-none',
}
for old, new in repls.items():
    if old not in t:
        raise SystemExit(f'missing friend marker: {old[:90]}')
    t = t.replace(old, new)

state_marker = '  const [sdWinnerCelebration, setSdWinnerCelebration] = useState<"blue" | "red" | null>(null);'
if state_marker not in t:
    raise SystemExit('missing friend celebration state marker')
t = t.replace(state_marker, state_marker + '\n  const [normalWinnerCelebration, setNormalWinnerCelebration] = useState<"blue" | "red" | null>(null);')

old_match_finish = '''      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);
      setStep("result"); return;'''
new_match_finish = '''      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);
      setNormalWinnerCelebration(d > 0 ? "blue" : "red");
      window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, 2300);
      return;'''
if old_match_finish not in t:
    raise SystemExit('missing match finish marker')
t = t.replace(old_match_finish, new_match_finish)

old_stroke_finish = '''      setStep("result"); return;
    }
    setHoleIndex'''
new_stroke_finish = '''      const strokeWinner = isShortGame ? (s.bluePoints > s.redPoints ? "blue" : "red") : (s.blueStrokes < s.redStrokes ? "blue" : "red");
      setNormalWinnerCelebration(strokeWinner);
      window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, 2300);
      return;
    }
    setHoleIndex'''
if old_stroke_finish not in t:
    raise SystemExit('missing stroke finish marker')
t = t.replace(old_stroke_finish, new_stroke_finish, 1)

overlay_marker = '    {step === "result" ? <><section className="mt-6 overflow-hidden'
if overlay_marker not in t:
    raise SystemExit('missing friend result marker')
friend_overlay = '''    {normalWinnerCelebration ? <div className={`fixed inset-0 z-[70] overflow-hidden ${normalWinnerCelebration === "blue" ? "bg-[#061d57]" : "bg-[#5f1018]"}`}>
      <style>{`@keyframes winTakeover{0%{opacity:0;transform:scale(1.04)}18%{opacity:1}100%{opacity:1;transform:scale(1)}}@keyframes winGlassIn{0%{opacity:0;transform:translateY(22px) scale(.92)}45%{opacity:1;transform:translateY(-4px) scale(1.03)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes winBurst{0%{opacity:0;transform:scale(.15)}22%{opacity:1}100%{opacity:0;transform:scale(3.2)}}@keyframes winShard{0%{opacity:0;transform:translate3d(0,-12vh,0) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate3d(var(--wx),112vh,0) rotate(var(--wr))}}`}</style>
      <div className={`absolute inset-0 ${normalWinnerCelebration === "blue" ? "bg-[radial-gradient(circle_at_50%_38%,rgba(147,197,253,.46),transparent_34%),linear-gradient(145deg,#2563eb,#071b4f)]" : "bg-[radial-gradient(circle_at_50%_38%,rgba(254,202,202,.42),transparent_34%),linear-gradient(215deg,#ef4444,#591019)]"}`} style={{animation:'winTakeover 620ms cubic-bezier(.2,.8,.2,1) both'}} />
      {[0,1,2].map((b) => <span key={b} className="absolute rounded-full border border-white/70" style={{left:`${24+b*26}%`,top:`${25+(b%2)*24}%`,width:54,height:54,animation:`winBurst 1.25s ${.15+b*.2}s ease-out both`}} />)}
      {Array.from({length:26}).map((_,i)=><span key={i} className="absolute top-[-8%] h-3 w-1 rounded-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,.45)]" style={{left:`${4+(i*17)%92}%`,['--wx' as any]:`${(i%2?1:-1)*(16+(i%5)*10)}px`,['--wr' as any]:`${180+(i%7)*60}deg`,animation:`winShard ${1.45+(i%5)*.13}s ${(i%9)*.06}s cubic-bezier(.15,.6,.2,1) both`}} />)}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center text-white">
        <div className="relative overflow-hidden rounded-[40px] border border-white/25 bg-white/[.11] px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,.38),0_36px_110px_rgba(0,0,0,.35)] backdrop-blur-3xl" style={{animation:'winGlassIn 820ms 180ms cubic-bezier(.2,.8,.2,1) both'}}>
          <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/65">MATCH AVGJORD</p>
          <p className="mt-4 font-display text-6xl leading-none">{normalWinnerCelebration === "blue" ? blueLabel : redLabel}</p>
          <div className="mx-auto mt-5 h-px w-20 bg-white/45" />
          <p className="mt-5 font-display text-4xl">VINNER</p>
        </div>
      </div>
    </div> : null}

'''
t = t.replace(overlay_marker, friend_overlay + overlay_marker)
p.write_text(t)

# --- Bot match: celebrate every win, normal or sudden death ---
p = Path('src/routes/match-bot.tsx')
b = p.read_text()
state_marker = '  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);'
if state_marker not in b:
    raise SystemExit('missing bot state marker')
b = b.replace(state_marker, state_marker + '\n  const [winnerCelebration, setWinnerCelebration] = useState<"you" | "bot" | null>(null);')

old_normal = '      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }\n      else setStep("result");'
new_normal = '      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }\n      else { setWinnerCelebration(finalYou > finalBot ? "you" : "bot"); await sleep(2300); setWinnerCelebration(null); setStep("result"); }'
if old_normal not in b:
    raise SystemExit('missing bot normal finish marker')
b = b.replace(old_normal, new_normal)

old_sd = '    setSuddenDeathWinner(youWin ? "you" : "bot");\n    setStep("result"); setSdBusy(false);'
new_sd = '    setSuddenDeathWinner(youWin ? "you" : "bot");\n    setWinnerCelebration(youWin ? "you" : "bot");\n    await sleep(2300);\n    setWinnerCelebration(null); setStep("result"); setSdBusy(false);'
if old_sd not in b:
    raise SystemExit('missing bot sudden finish marker')
b = b.replace(old_sd, new_sd)

bot_result_marker = '      {step === "result" ? ('
if bot_result_marker not in b:
    raise SystemExit('missing bot result marker')
bot_overlay = '''      {winnerCelebration ? <div className={`fixed inset-0 z-[70] overflow-hidden ${winnerCelebration === "you" ? "bg-[#061d57]" : "bg-[#5f1018]"}`}>
        <style>{`@keyframes botWinIn{0%{opacity:0;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}@keyframes botWinCard{0%{opacity:0;transform:translateY(24px) scale(.92)}55%{opacity:1;transform:translateY(-3px) scale(1.03)}100%{opacity:1;transform:none}}@keyframes botWinShard{0%{opacity:0;transform:translateY(-14vh) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate3d(var(--bx),112vh,0) rotate(var(--br))}}`}</style>
        <div className={`absolute inset-0 ${winnerCelebration === "you" ? "bg-[radial-gradient(circle_at_50%_38%,rgba(147,197,253,.46),transparent_34%),linear-gradient(145deg,#2563eb,#071b4f)]" : "bg-[radial-gradient(circle_at_50%_38%,rgba(254,202,202,.42),transparent_34%),linear-gradient(215deg,#ef4444,#591019)]"}`} style={{animation:'botWinIn 620ms ease-out both'}} />
        {Array.from({length:26}).map((_,i)=><span key={i} className="absolute top-[-8%] h-3 w-1 rounded-full bg-white/85" style={{left:`${4+(i*17)%92}%`,['--bx' as any]:`${(i%2?1:-1)*(16+(i%5)*10)}px`,['--br' as any]:`${180+(i%7)*60}deg`,animation:`botWinShard ${1.45+(i%5)*.13}s ${(i%9)*.06}s ease-out both`}} />)}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center text-white"><div className="relative overflow-hidden rounded-[40px] border border-white/25 bg-white/[.11] px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,.38),0_36px_110px_rgba(0,0,0,.35)] backdrop-blur-3xl" style={{animation:'botWinCard 820ms 180ms cubic-bezier(.2,.8,.2,1) both'}}><span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"/><p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/65">MATCH AVGJORD</p><p className="mt-4 font-display text-6xl leading-none">{winnerCelebration === "you" ? playerName : bot.name}</p><div className="mx-auto mt-5 h-px w-20 bg-white/45"/><p className="mt-5 font-display text-4xl">VINNER</p></div></div>
      </div> : null}

'''
b = b.replace(bot_result_marker, bot_overlay + bot_result_marker)
p.write_text(b)
