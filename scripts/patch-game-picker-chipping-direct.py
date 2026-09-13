from pathlib import Path
import re

p = Path('src/routes/match.tsx')
t = p.read_text()

# Rename Chipp to Chippning in the actual game picker.
t = t.replace('{ id: "around-the-green", title: "Chipp", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },', '{ id: "around-the-green", title: "Chippning", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },')

# Chipping no longer depends on a selected lie. It is simply a random distance from the flag.
old_challenge = '''  if (category === "around-the-green") {
    const lie = pick(shortGameLies.length ? shortGameLies : (["fairway"] as ShortGameLie[]));
    if (lie === "bunker") return { eyebrow: "Bunker", title: "Bunker", detail: `Slå så nära flaggan som möjligt.${suffix}` };
    return { eyebrow: "Closest to the Pin", title: `${rand(10, 30)} m från ${lieLabel(lie)}`, detail: `Slå så nära flaggan som möjligt.${suffix}` };
  }'''
new_challenge = '''  if (category === "around-the-green") {
    return { eyebrow: "Chippning", title: `${rand(10, 30)} m`, detail: `Närmast hålet vinner.${suffix}` };
  }'''
if old_challenge not in t:
    raise SystemExit('short game challenge block missing')
t = t.replace(old_challenge, new_challenge, 1)

# Chipping can start without a setup selection and generates one distance per hole directly.
t = t.replace('if (!mode || !teamsReady || !category || !matchType || (isShortGame && !setupValid)) return;', 'if (!mode || !teamsReady || !category || !matchType) return;')
t = t.replace('''      : isShortGame
      ? generateShortGameLieSequence(matchLength, shortGameLies).map((lie) => ({ challenge: generateChallenge(category, matchType, mode, [lie]), winner: null as HoleWinner }))''', '''      : isShortGame
      ? Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode), winner: null as HoleWinner }))''')

# Back from length for chipping should go straight back to the game picker, just like putting.
t = t.replace('else if (step === "length") setStep(isShortGame ? "setup" : isApproach ? "approach-setup" : category === "off-the-tee" || isPutting ? "category" : "scoring");', 'else if (step === "length") setStep(isApproach ? "approach-setup" : category === "off-the-tee" || isPutting || isShortGame ? "category" : "scoring");')

# The category step is a true game picker: one large card per row, title only, and tap goes directly into that game's next screen.
pattern = re.compile(r'''    \{step === "category" \? <>.*?</> : null\}\n\n    \{step === "type"''', re.S)
replacement = '''    {step === "category" ? <>
      <section className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match</p>
        <h1 className="mt-1 font-display text-4xl">Vad ska ni tävla i?</h1>
      </section>
      <div className="mt-6 space-y-4">{CATEGORIES.map((i) => <button key={i.id} onClick={() => {
        setCategory(i.id);
        setScoringMode("match");
        if (i.id === "putting") { setMatchType("standard"); setMatchLength(5); setStep("length"); return; }
        if (i.id === "around-the-green") { setMatchType("closest"); setMatchLength(5); setStep("length"); return; }
        if (i.id === "approach") { setMatchType("closest"); setApproachRanges([]); setStep("approach-setup"); return; }
        setMatchType("fairway"); setStep("length");
      }} className={`group relative flex min-h-28 w-full items-center justify-between overflow-hidden rounded-[30px] border px-6 py-6 text-left transition active:scale-[.985] ${glass}`}>
        <span className="font-display text-3xl leading-none text-slate-950">{i.title}</span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white/75 text-2xl text-slate-700 shadow-sm backdrop-blur-xl transition group-active:translate-x-0.5">›</span>
      </button>)}</div>
    </> : null}

    {step === "type"'''
t, n = pattern.subn(replacement, t, count=1)
if n != 1:
    raise SystemExit('category game picker block missing')

# Make the length screen label match the new Chipping name.
t = t.replace('step === "setup" ? "Chipp · Setup"', 'step === "setup" ? "Chippning"')

p.write_text(t)
