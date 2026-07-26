## Mål

I Combine-testet ska driverstationen mäta både längd och riktning, och approachstationerna ska tydligt visa träffsäkerhet i procent av slaglängden.

## Driver: längd + rakhet

Idag matas bara carry in för driver (140 m = 0 p, 280 m = 100 p). Ändring:

- Två fält per driverslag: **carry (m)** och **sidoavvikelse (m)** (offline, hur långt från mittlinjen bollen hamnar).
- Poäng per driverslag = 60 % längdpoäng + 40 % rakhetspoäng.
  - Längdpoäng: som idag (140–280 m → 0–100).
  - Rakhetspoäng: sidoavvikelse i procent av carry. 0 % = 100 p, 8 % = 0 p (ca 8 m offline på 100 m carry). Linjär däremellan.
- Stationskortet för driver visar snittcarry, snittavvikelse i meter och i procent, samt total stationspoäng.

## Approach: resultat i procent

- Poängen bygger redan på proximity i procent av avståndet (3 % = 100 p, 25 % = 0 p) — den logiken behålls.
- Nytt i UI: varje approachstation visar **snittproximity i meter och i procent**, och stapeldiagrammet får procenten som etikett så man direkt ser vilket avstånd som är bäst/sämst.
- Sammanfattningen får ett nyckeltal: **snittproximity % för hela testet** vid sidan av totalpoängen.

## Bakåtkompatibilitet

Gamla sparade sessioner saknar sidoavvikelse. De behandlas som "endast längd" för driver, så historiken och graferna fortsätter fungera utan omräkning.

## Teknisk detalj

- `src/lib/combine.ts`: lägg till `offline?: number` på `CombineShot`, ny `driverScore(carry, offline)`, uppdatera `shotScore`, och utöka `StationScore` med `avgPct` (approach) respektive `avgOffline`/`avgOfflinePct` (driver).
- `src/routes/combine.tsx`: extra inmatningsfält för driverslag, procentvisning per station, procent i stapeldiagrammets etiketter och nytt nyckeltal i sammanfattningen.
