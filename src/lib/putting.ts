/**
 * Putting Test – slår ihop Short Putting Test och Lag Putt till EN
 * testupplevelse, samma mönster som Approach: ett kort huvudtest (6
 * puttar: 3 korta + 3 lagputtar) som standard, och ett dolt utökat test
 * (18 puttar: 12 korta + 6 lagputtar) för erfarna spelare.
 *
 * Medveten arkitektur: den här filen INNEHÅLLER INGEN EGEN
 * poängsättningslogik. Den återanvänder shortputt.ts och lagputt.ts helt
 * oförändrade (samma ShortPutt/LagPutt-typer, samma
 * saveShortPuttSession()/saveLagPuttSession(), samma lagring) – så all
 * befintlig kategori-HCP-beräkning, Trophy Room-achievements och
 * mönsteranalys i resten av appen fortsätter fungera exakt som innan,
 * helt opåverkade av den nya sammanslagna ytan. Den här filen är bara ett
 * tunt lager som kombinerar de två redan färdiga resultaten till EN
 * gemensam vy, med samma 60/40-viktning som redan används för
 * Puttning-kategorins HCP i sg-handicap.ts.
 */

export type PuttingMode = "main" | "extended";

/** Samma viktning som combinePuttingHandicap i sg-handicap.ts. */
export function combinedPuttingHandicap(shortHcp: number, lagHcp: number): number {
  return Math.round((shortHcp * 0.6 + lagHcp * 0.4) * 10) / 10;
}
