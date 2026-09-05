# SG4 – Audit och prioriterade nästa steg

Audit klar. Inga kodändringar gjorda (planläge). De fem byggfelen du klistrade in kräver byggläge – de ingår som första punkt nedan.

## P0 – gör först

**1. Byggfel: länkar till "/traning" saknar sökparameter (5 st)**
`src/routes/lagputt.tsx` (rad 75, 149, 221), `src/routes/shot-shaping.tsx` (rad 58), `src/routes/tester.tsx` (rad 103).
Fix: lägg till `search={{ category: undefined }}` på varje länk, precis som övriga sidor redan gör.

**2. Lagputt-resultat räknas inte in i handicap**
`/lagputt` sparar numera via `src/lib/lagputt18.ts` (nyckel `sg4-lagputt-18-v1`), men handicap-, trofé-, progress- och mönsteranalys läser fortfarande gamla `src/lib/lagputt.ts` (nyckel `golf-lagputt-sessions-v3`). Se `sg-handicap.ts:12`, `trophy-room.ts:7`, `category-index.ts:5`, `progress.ts:14`, `cross-test-patterns.ts:7`.
Följd: nya lagputt-tester påverkar inte Putting-HCP alls. Beslut behövs: ska 18-puttarstestet mata handicap, eller ska det förbli ett rent träningstest? (Rekommendation: förbli träningstest, men då bör HCP-vyerna sluta visa lagputt som datakälla.)

**3. Nästan all testdata finns bara lokalt i telefonen**
Endast bunker synkas till molnet (`src/lib/cloud.ts`). Alla övriga ~20 tester lagras enbart i webbläsarens lagring och försvinner vid ny telefon eller rensad data. Dessutom konverterar `cloud.ts:15-19` meter till fot för att passa den gamla molntabellen.

## P1

- **Premium-låset är avstängt och går att kringgå.** `src/lib/subscription.tsx:20-29` returnerar alltid "plus"; dessutom kan planen sättas via webbläsarlagring utan någon serverkontroll. Fungerar som avsikt idag, men får inte lanseras så.
- **25-bollsövningen heter fortfarande 50 i koden.** Adress `/50-bollar`, filnamn `50-bollar.tsx`, `50-bollar-resultat.tsx`, hela `src/lib/fifty-putts.ts` och lagringsnyckeln `sg4:fifty-putt-sessions:v1`. Texterna utåt är korrekta. Byte av adress kräver omdirigering från den gamla.
- **Bottenmenyn döljs bara i vissa tester.** Saknas i `chip.tsx`, `pitch.tsx`, `longdrive.tsx`, `wedge-stege.tsx`, `teeshot.tsx`, `upp-och-in.tsx`, `green-reading.tsx` och de tre shot-shaping-testerna – risk att man råkar navigera bort mitt i inmatning.
- **Dubbelsparande vid sista slaget.** `50-bollar.tsx` sparar direkt i klickhanteraren utan spärr, till skillnad från t.ex. `bunker.tsx` som sparar i en effekt.
- **Handicapformlerna innehåller lösa magiska tal.** `sg-handicap.ts:60`, `:98` (`handicapFromRating` saknar begränsning uppåt/nedåt till skillnad från sin motsats), kategori-vikter på flera ställen, samt två olika "senaste X tester"-fönster (5 respektive 6).

## P2

- Endast ett automatiskt test finns i hela projektet (`src/lib/offtee.test.ts`). Scoring- och handicaplogik saknar helt testtäckning.
- Flera filer är skrivna som en enda mycket lång rad (`fifty-putts.ts`, `50-bollar.tsx`, `50-bollar-resultat.tsx`, `friends-cloud.ts`) – svårt att granska och ändra säkert.
- 68 sidfiler, bl.a. tre nästan identiska shot-shaping-sidor och en död `/lagputt-test`-omdirigering.
- Samma kortstilar upprepas som lång klasslista på dussintals ställen istället för en delad komponent.

## Förslag på ordning

1. Fixa de fem byggfelen (liten, isolerad ändring).
2. Bestäm lagputt-frågan och koppla ihop eller koppla loss datakällan.
3. Molnbackup för all testhistorik.
4. Därefter P1-punkterna i listad ordning.
