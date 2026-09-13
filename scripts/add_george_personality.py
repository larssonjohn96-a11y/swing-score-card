from pathlib import Path
p = Path('src/lib/bot-personality.ts')
t = p.read_text()
needle = '''  zach: {\n    type: "trash-talker",'''
insert = '''  george: {\n    type: "grumpy-old-guy", label: "Grumpy old guy", oneLiner: "Old-school klubbveteranen som tillrättavisar allt från klubbval till tempo och nästan alltid låter lite irriterad.",\n    talkRate: .9, praiseRate: .08, correctionRate: .96, tiltRate: .54, trashTalk: .42, memory: "Minns dina dåliga beslut och påminner dig gärna om dem nästa gång.",\n    phrases: {\n      start: ["Jaha. Då ska vi se om det blir golf eller bara svingande idag.", "Försök hålla tempot nu. Vi har inte hela dagen."],\n      botWin: ["Precis. Man behöver inte göra det svårare än det är.", "Det där lärde man sig innan folk började filma varje sving."],\n      playerWin: ["Jo jo. En blind höna hittar också ett korn.", "Det där var faktiskt okej. Bli inte för nöjd nu."],\n      tie: ["Delat. Kunde varit bättre från båda."],\n      pressure: ["Nu får vi se om du kan slå när det faktiskt gäller."],\n      playerBad: ["Vad var det där? Du försöker ju hjälpa bollen.", "Alldeles för bråttom. Jag sa ju det."],\n      botBad: ["Mattan tog den. Sånt där händer inte på riktigt gräs.", "Hmpf. Dålig studs."],\n      rematch: ["En till då. Och den här gången: tänk innan du slår."],\n    },\n  },\n  zach: {\n    type: "trash-talker",'''
if needle not in t:
    raise SystemExit('zach insertion point not found')
p.write_text(t.replace(needle, insert, 1))
