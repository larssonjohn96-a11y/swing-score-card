from pathlib import Path
p=Path('src/routes/match.tsx')
s=p.read_text()
old='onClick={() => { if (category === "approach" && matchType === "closest") { setScoringMode("match"); setStep("length"); } else { setStep("scoring"); } }}'
new='onClick={() => setStep("scoring")}'
if old not in s: raise SystemExit('anchor not found')
p.write_text(s.replace(old,new,1))
