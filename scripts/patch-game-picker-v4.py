from pathlib import Path

p = Path('src/routes/match.tsx')
t = p.read_text()
old = '''const CATEGORIES = [
  { id: "off-the-tee", title: "Utslag", subtitle: "Off the Tee", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Inspel", subtitle: "Approach", description: "Closest to Pin med varierade avstånd och exakt proximity." },
  { id: "around-the-green", title: "Närspel", subtitle: "Around the Green", description: "Närmast flaggan från fairway, rough och bunker." },
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Håla ut och låt SG4 räkna resultatet automatiskt." },
] as const;'''
new = '''const CATEGORIES = [
  { id: "putting", title: "Puttning", subtitle: "Putting Match", description: "Spela en riktig puttingmatch hål för hål. Färre puttar vinner hålet." },
  { id: "around-the-green", title: "Chipp", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },
  { id: "approach", title: "Closest to Pin", subtitle: "Inspel", description: "Slå mot samma mål från varierade avstånd. Närmast flaggan vinner." },
  { id: "off-the-tee", title: "30 m Fairway Challenge", subtitle: "Driver", description: "Längsta godkända drive inom en 30 meter bred fairway vinner." },
] as const;'''
if old not in t:
    raise SystemExit('CATEGORIES marker missing')
t = t.replace(old, new, 1)
# Rename user-facing short-game labels in the play flow while keeping internal ids/types unchanged.
t = t.replace('<p className="text-[10px] font-bold uppercase text-slate-500">Närspel</p><h1 className="mt-1 font-display text-4xl">Setup</h1>', '<p className="text-[10px] font-bold uppercase text-slate-500">Chipp</p><h1 className="mt-1 font-display text-4xl">Setup</h1>')
t = t.replace('step === "setup" ? "Närspel · Setup"', 'step === "setup" ? "Chipp · Setup"')
p.write_text(t)
