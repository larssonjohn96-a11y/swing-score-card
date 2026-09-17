from pathlib import Path
import re

path = Path('src/routes/match-bot.tsx')
text = path.read_text()

text = text.replace(
    '  tier: "Nybörjare" | "Klubbspelare" | "Avancerad" | "Elit";\n  avatar: string;',
    '  tier: "Nybörjare" | "Klubbspelare" | "Medel" | "Avancerad" | "Elit" | "PRO" | "Tour" | "Final Boss";\n  avatar: string;\n  country: string;\n  flag: string;'
)

start = text.index('const BOTS: BotProfile[] = [')
end = text.index('const CATEGORIES = [', start)

replacement = r'''function makeBot({
  id, name, hcp, gender, role, tier, avatar, country, flag, intro, label, playStyle = "balanced", temperament = "calm", communication = "focused", aggression = 0.5, consistency = 0.65, clutch = 0.6, traits = [], locked = false,
}: {
  id: string; name: string; hcp: number; gender: "Kvinna" | "Man"; role: string; tier: BotProfile["tier"]; avatar: string; country: string; flag: string; intro: string; label: string;
  playStyle?: BotArchetype["playStyle"]; temperament?: BotArchetype["temperament"]; communication?: BotArchetype["communication"]; aggression?: number; consistency?: number; clutch?: number; traits?: string[]; locked?: boolean;
}): BotProfile {
  const base = hcp;
  return {
    id, name, hcp, gender, role, tier, avatar, country, flag, intro,
    categoryHcp: { putting: base - 1, chipping: base, approach: base + 1, driving: base + 2 },
    archetype: { label, playStyle, temperament, communication, aggression, consistency, clutch, traits },
    locked,
    unlockText: locked ? "Vinn matcher för att låsa upp" : undefined,
    chat: genericChat,
  };
}

const BOTS: BotProfile[] = [
  makeBot({ id: "erik", name: "Erik", hcp: 52, gender: "Man", role: "Förstagångsgolfare", tier: "Nybörjare", avatar: "🧑🏼", country: "Sverige", flag: "🇸🇪", intro: "Nytt är kul. Varje bra slag firas.", label: "Rookien", temperament: "streaky", communication: "social", consistency: .20, clutch: .25, traits: ["Ojämn", "Entusiastisk"] }),
  makeBot({ id: "sara", name: "Sara", hcp: 48, gender: "Kvinna", role: "Nybörjare", tier: "Nybörjare", avatar: "👩🏻", country: "Danmark", flag: "🇩🇰", intro: "Lugn golf och stora leenden.", label: "Glädjespelaren", communication: "warm", consistency: .26, traits: ["Lugn", "Positiv"] }),
  makeBot({ id: "ali", name: "Ali", hcp: 42, gender: "Man", role: "Nybörjare", tier: "Nybörjare", avatar: "🧑🏽", country: "Storbritannien", flag: "🇬🇧", intro: "Har fart men inte alltid riktning.", label: "Power-rookien", playStyle: "aggressive", aggression: .7, consistency: .28, traits: ["Lång", "Vild"] }),
  makeBot({ id: "margaret", name: "Margaret", hcp: 33, gender: "Kvinna", role: "Grandma golfer", tier: "Nybörjare", avatar: "👵🏻", country: "England", flag: "🇬🇧", intro: "Varm, erfaren och lite för nöjd när gamla knep fungerar.", label: "Klubbmormorn", playStyle: "conservative", communication: "warm", consistency: .55, clutch: .64, traits: ["Kortspel", "Tålamod"] }),

  makeBot({ id: "lisa", name: "Lisa", hcp: 32, gender: "Kvinna", role: "Klubbspelare", tier: "Klubbspelare", avatar: "👩🏻", country: "Sverige", flag: "🇸🇪", intro: "Spelar enkelt och håller bollen i spel.", label: "Fairway-först", playStyle: "conservative", consistency: .48, traits: ["Rak", "Trygg"] }),
  makeBot({ id: "johan", name: "Johan", hcp: 26, gender: "Man", role: "Klubbspelare", tier: "Klubbspelare", avatar: "🧔🏼", country: "Sverige", flag: "🇸🇪", intro: "Stabil klubbspelare utan stora utsvävningar.", label: "Klubbmotorn", consistency: .53, traits: ["Stabil", "Jämn"] }),
  makeBot({ id: "zach", name: "Zach", hcp: 22, gender: "Man", role: "Weekend golfer", tier: "Klubbspelare", avatar: "🧔🏻", country: "USA", flag: "🇺🇸", intro: "Jag gillar att slå långt. Precisionen får vi se hur det går med.", label: "Bombaren", playStyle: "aggressive", temperament: "competitive", communication: "cocky", aggression: .88, consistency: .34, clutch: .47, traits: ["Lång från tee"] }),
  makeBot({ id: "peter", name: "Peter", hcp: 18, gender: "Man", role: "Klubbspelare", tier: "Klubbspelare", avatar: "🧢", country: "Norge", flag: "🇳🇴", intro: "Gillar ordning, tempo och fairways.", label: "Poängplockaren", playStyle: "conservative", consistency: .60, traits: ["Fairways", "Bogeyfri"] }),

  makeBot({ id: "anna", name: "Anna", hcp: 17, gender: "Kvinna", role: "Medelhandicap", tier: "Medel", avatar: "👩🏻", country: "Sverige", flag: "🇸🇪", intro: "Jag ger sällan bort ett hål.", label: "Klubbmaskinen", playStyle: "conservative", consistency: .70, clutch: .61, traits: ["Ger bort få hål"] }),
  makeBot({ id: "marcus", name: "Marcus", hcp: 15, gender: "Man", role: "Tävlingsspelare", tier: "Medel", avatar: "👨🏽", country: "Tyskland", flag: "🇩🇪", intro: "Går gärna rakt på flaggan.", label: "Pin huntern", playStyle: "aggressive", temperament: "competitive", aggression: .82, consistency: .58, traits: ["Aggressiv", "Flaggjägare"] }),
  makeBot({ id: "elin", name: "Elin", hcp: 13, gender: "Kvinna", role: "Klubbspelare", tier: "Medel", avatar: "👱🏻‍♀️", country: "Finland", flag: "🇫🇮", intro: "Kontrollerad fart och bra känsla.", label: "Tempospelaren", consistency: .67, traits: ["Tempo", "Kontroll"] }),
  makeBot({ id: "oskar", name: "Oskar", hcp: 12, gender: "Man", role: "Tävlingsgolfare", tier: "Medel", avatar: "🧑🏻", country: "Sverige", flag: "🇸🇪", intro: "Börjar se scorer under 80 allt oftare.", label: "Scorern", temperament: "competitive", consistency: .69, clutch: .66, traits: ["Scoring", "Press"] }),

  makeBot({ id: "emma", name: "Emma", hcp: 9, gender: "Kvinna", role: "Singelhandicap", tier: "Avancerad", avatar: "👩🏼‍🦱", country: "Sverige", flag: "🇸🇪", intro: "Fairways, greener och tålamod. Jag gör inte många stora misstag.", label: "Fairway-maskinen", playStyle: "conservative", temperament: "calm", aggression: .28, consistency: .84, clutch: .72, traits: ["Spelar rakt", "Trygg puttare", "Jämn"] }),
  makeBot({ id: "david", name: "David", hcp: 6, gender: "Man", role: "Singelhandicap", tier: "Avancerad", avatar: "🧑🏽", country: "Peru", flag: "🇵🇪", intro: "Aggressiv när läget finns.", label: "Shotmakern", playStyle: "aggressive", aggression: .73, consistency: .79, clutch: .78, traits: ["Attack", "Shape"] }),
  makeBot({ id: "nora", name: "Nora", hcp: 5, gender: "Kvinna", role: "Tävlingsgolfare", tier: "Avancerad", avatar: "👱🏻‍♀️", country: "Nederländerna", flag: "🇳🇱", intro: "Tar smarta beslut och missar på rätt sida.", label: "Strategen", playStyle: "conservative", consistency: .83, clutch: .80, traits: ["Smart", "Konsekvent"] }),
  makeBot({ id: "ryan", name: "Ryan", hcp: 3, gender: "Man", role: "College player", tier: "Avancerad", avatar: "🧑🏽", country: "USA", flag: "🇺🇸", intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", label: "College grindern", playStyle: "aggressive", temperament: "competitive", aggression: .72, consistency: .86, clutch: .86, traits: ["Press", "Tempo"], locked: true }),

  makeBot({ id: "stella", name: "Stella", hcp: 2, gender: "Kvinna", role: "Elitamatör", tier: "Elit", avatar: "👱🏻‍♀️", country: "Sverige", flag: "🇸🇪", intro: "Stabil elitgolf med få misstag.", label: "Elitmaskinen", consistency: .89, clutch: .86, traits: ["Precision", "Stabil"] }),
  makeBot({ id: "viktor", name: "Viktor", hcp: 1, gender: "Man", role: "Elitamatör", tier: "Elit", avatar: "🧑🏻", country: "Tjeckien", flag: "🇨🇿", intro: "Pars känns som missade chanser.", label: "Birdiejägaren", playStyle: "aggressive", aggression: .78, consistency: .90, clutch: .88, traits: ["Birdies", "Attack"] }),
  makeBot({ id: "alma", name: "Alma", hcp: 0, gender: "Kvinna", role: "Scratch", tier: "Elit", avatar: "👩🏻", country: "Spanien", flag: "🇪🇸", intro: "Scratch. Inga gratis slag.", label: "Scratch-taktikern", temperament: "ice-cold", consistency: .92, clutch: .92, traits: ["Scratch", "Kall"] }),
  makeBot({ id: "noah", name: "Noah", hcp: -2, gender: "Man", role: "College standout", tier: "Elit", avatar: "🧑🏼‍🦰", country: "USA", flag: "🇺🇸", intro: "Jag spelar för att vinna. Pars räcker inte alltid.", label: "College-killern", playStyle: "aggressive", temperament: "ice-cold", aggression: .80, consistency: .93, clutch: .94, traits: ["Attack", "Clutch"], locked: true }),

  makeBot({ id: "linn", name: "Linn", hcp: -2, gender: "Kvinna", role: "Pro", tier: "PRO", avatar: "👩🏻", country: "Sverige", flag: "🇸🇪", intro: "Professionell rytm och väldigt få stora missar.", label: "Pro precision", consistency: .94, clutch: .93, traits: ["Precision", "Tempo"] }),
  makeBot({ id: "axel", name: "Axel", hcp: -3, gender: "Man", role: "Pro", tier: "PRO", avatar: "🧑🏻", country: "Danmark", flag: "🇩🇰", intro: "Spelar aggressivt när siffrorna säger ja.", label: "Data-proffset", playStyle: "aggressive", consistency: .95, clutch: .94, traits: ["Data", "Attack"] }),
  makeBot({ id: "maya", name: "Maya", hcp: -4, gender: "Kvinna", role: "Pro", tier: "PRO", avatar: "👩🏾", country: "Frankrike", flag: "🇫🇷", intro: "Nästan inga gratis slag.", label: "Pro taktiker", temperament: "ice-cold", consistency: .96, clutch: .96, traits: ["Komplett", "Kall"], locked: true }),
  makeBot({ id: "sofia", name: "Sofia", hcp: -5, gender: "Kvinna", role: "Tour prospect", tier: "PRO", avatar: "👩🏻‍🦰", country: "Italien", flag: "🇮🇹", intro: "Små marginaler. Ett svagt slag och jag tar hålet.", label: "Tour prospect", temperament: "ice-cold", consistency: .97, clutch: .97, traits: ["Små marginaler"], locked: true }),

  makeBot({ id: "julia", name: "Julia", hcp: -6, gender: "Kvinna", role: "Tour player", tier: "Tour", avatar: "👩🏼", country: "Sverige", flag: "🇸🇪", intro: "Tourtempo från första slaget.", label: "Tour scorer", temperament: "ice-cold", consistency: .975, clutch: .97, traits: ["Tour", "Scoring"] }),
  makeBot({ id: "henrik", name: "Henrik", hcp: -8, gender: "Man", role: "Tour player", tier: "Tour", avatar: "🧔🏻", country: "Sverige", flag: "🇸🇪", intro: "Varje miss är liten och varje birdiechans räknas.", label: "Tour grindern", consistency: .98, clutch: .98, traits: ["Birdies", "Grind"] }),
  makeBot({ id: "isabelle", name: "Isabelle", hcp: -10, gender: "Kvinna", role: "Tour star", tier: "Tour", avatar: "👩🏼‍🦱", country: "Frankrike", flag: "🇫🇷", intro: "Världsklass över hela spelet.", label: "Tourstjärnan", temperament: "ice-cold", consistency: .99, clutch: .99, traits: ["Världsklass", "Clutch"], locked: true }),
  makeBot({ id: "alex", name: "Alex", hcp: -12, gender: "Man", role: "Tour elite", tier: "Tour", avatar: "😎", country: "USA", flag: "🇺🇸", intro: "Du behöver spela nära ditt tak för att slå mig.", label: "Tour elite", temperament: "ice-cold", consistency: .995, clutch: .995, traits: ["Komplett", "Obeveklig"], locked: true }),

  {
    ...makeBot({ id: "mer-birdie-man", name: "Mer Birdie Man", hcp: -18, gender: "Man", role: "Final Boss", tier: "Final Boss", avatar: "😎", country: "Okänd", flag: "🏴", intro: "Gör birdie på varje hål.", label: "Final Boss", playStyle: "aggressive", temperament: "ice-cold", communication: "cocky", aggression: 1, consistency: 1, clutch: 1, traits: ["Birdie varje hål", "Legendisk precision", "Alltid hotande"], locked: true }),
    categoryHcp: { putting: -18, chipping: -18, approach: -18, driving: -18 },
  },
];

const BOT_TIER_META: { tier: BotProfile["tier"]; range: string }[] = [
  { tier: "Nybörjare", range: "HCP 52–33" },
  { tier: "Klubbspelare", range: "HCP 32–18" },
  { tier: "Medel", range: "HCP 17–12" },
  { tier: "Avancerad", range: "HCP 11–3" },
  { tier: "Elit", range: "HCP 2–+2" },
  { tier: "PRO", range: "HCP +2–+5" },
  { tier: "Tour", range: "HCP +6–+12" },
  { tier: "Final Boss", range: "HCP +18" },
];

'''

text = text[:start] + replacement + text[end:]
text = text.replace('const [botId, setBotId] = useState(() => cupContext?.botId ?? "zach");', 'const [botId, setBotId] = useState(() => cupContext?.botId ?? "emma");')

old = '''          <section className={`sticky top-3 z-30 mt-4 rounded-[24px] border px-4 py-3 ${glass}`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-display text-xl">{bot.name}</p>
                  <p className="shrink-0 text-xs font-black text-red-700">HCP {formatHcp(bot.hcp)}</p>
                </div>
                <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{BOT_PERSONALITIES[bot.id]?.oneLiner}</p>
                {relationshipLine(bot.id, bot.name) ? <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-500">{relationshipLine(bot.id, bot.name)}</p> : null}
              </div>
            </div>
          </section>
          <div className="mt-4 space-y-6">
            {BOT_TIERS.map((tier) => (
              <section key={tier}>
                <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tier}</p>
                <div className="grid grid-cols-2 gap-3">
                  {BOTS.filter((item) => item.tier === tier).map((item) => {
                    const active = item.id === bot.id;
                    return (
                      <button key={item.id} disabled={item.locked} onClick={() => chooseBot(item)} className={`relative min-h-[176px] overflow-hidden rounded-[26px] border p-4 text-left transition ${item.locked ? "border-slate-300 bg-slate-100/90 opacity-75" : active ? selected : glass}`}>
                        {item.locked ? <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white"><Lock className="h-4 w-4" /></span> : active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"><Check className="h-4 w-4" /></span> : null}
                        <span className={`text-5xl leading-none ${item.locked ? "grayscale" : ""}`}>{item.avatar}</span>
                        <span className="mt-3 block font-display text-2xl">{item.name}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-700">HCP {formatHcp(item.hcp)}</span>
                        <span className="mt-1 block text-[11px] text-slate-500">{item.gender} · {item.role}</span>
                        <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[item.id]?.label ?? item.archetype.label}</span><span className="mt-1 block text-[10px] text-slate-500">{BOT_PERSONALITIES[item.id]?.oneLiner}</span>
                        {item.locked ? <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">Låst</span> : null}
                        {item.locked && item.unlockText ? <span className="mt-1 block text-[10px] leading-snug text-slate-500">{item.unlockText}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>'''

new = '''          <section className={`sticky top-2 z-30 mt-4 rounded-[24px] border px-4 py-3.5 ${glass}`}>
            <div className="flex items-center gap-3">
              <span className="text-5xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-[23px] leading-none">{bot.name}</p>
                  <span className="text-lg">{bot.flag}</span>
                  <p className="ml-auto shrink-0 text-xs font-black text-red-700">HCP {formatHcp(bot.hcp)}</p>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label} · {bot.role}</p>
                <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">{bot.intro}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{bot.archetype.traits.slice(0, 3).map((trait) => <span key={trait} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2 text-[10px] font-semibold text-slate-500"><span>{bot.country}</span><span className="capitalize">{bot.archetype.playStyle === "aggressive" ? "Aggressiv" : bot.archetype.playStyle === "conservative" ? "Kontrollerad" : "Balanserad"} spelstil</span></div>
          </section>
          <div className="mt-4 space-y-5">
            {BOT_TIER_META.map(({ tier, range }) => {
              const tierBots = BOTS.filter((item) => item.tier === tier);
              if (tier === "Final Boss") {
                const item = tierBots[0];
                if (!item) return null;
                return <section key={tier}><div className="mb-2 flex items-baseline justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Final Boss</p><p className="text-[10px] font-bold text-slate-400">{range}</p></div><button disabled className="relative w-full overflow-hidden rounded-[26px] border border-emerald-900/30 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 p-4 text-left text-white shadow-xl"><span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Lock className="h-4 w-4" /></span><div className="flex items-center gap-4"><span className="text-5xl">{item.avatar}</span><div><p className="font-display text-2xl">{item.name}</p><p className="mt-1 text-sm font-black text-emerald-300">HCP {formatHcp(item.hcp)}</p><p className="mt-1 text-xs text-white/75">Gör birdie på varje hål.</p></div></div></button></section>;
              }
              return (
                <section key={tier}>
                  <div className="mb-2 flex items-baseline justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tier}</p><p className="text-[10px] font-bold text-slate-400">{range}</p></div>
                  <div className="grid grid-cols-4 gap-2">
                    {tierBots.map((item) => {
                      const active = item.id === bot.id;
                      return (
                        <button key={item.id} disabled={item.locked} onClick={() => chooseBot(item)} className={`relative min-h-[132px] overflow-hidden rounded-[20px] border px-1.5 py-3 text-center transition ${item.locked ? "border-slate-300 bg-slate-100/90 opacity-60" : active ? selected : glass}`}>
                          {item.locked ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white"><Lock className="h-3 w-3" /></span> : active ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                          <span className={`block text-[36px] leading-none ${item.locked ? "grayscale" : ""}`}>{item.avatar}</span>
                          <span className="mt-2 block truncate font-display text-[15px] leading-none">{item.name}</span>
                          <span className="mt-2 block text-[11px] font-bold text-slate-600">HCP {formatHcp(item.hcp)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>'''

if old not in text:
    raise SystemExit('Selector block not found')
text = text.replace(old, new)

path.write_text(text)
print('Updated', path)
