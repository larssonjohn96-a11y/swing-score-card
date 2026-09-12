from pathlib import Path
p=Path('src/routes/match.tsx')
s=p.read_text()
old='''  const resultScoreText = scoringMode === "match"\n    ? diff === 0 ? "AS" : holesRemaining > 0 ? `${Math.abs(diff)}&${holesRemaining}` : `${Math.abs(diff)} UP`'''
new='''  const resultScoreText = scoringMode === "match"\n    ? diff === 0 ? "AS" : `${Math.abs(diff)}&${holesRemaining}`'''
if old not in s:
    raise SystemExit('result score anchor not found')
s=s.replace(old,new,1)
p.write_text(s)
