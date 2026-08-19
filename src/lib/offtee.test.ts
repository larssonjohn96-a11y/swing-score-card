import { describe, expect, it } from "vitest";
import { offTeeResult, shotHandicap, type TeeShot } from "@/lib/offtee";

/**
 * Regressionssvit för Off the Tee-testets Driving HCP-modell (v4).
 *
 * Syfte: när modellen ändras nästa gång (kalibrering mot riktig SG4-data,
 * nya vikter, nya ankarpunkter) ska den här filen köras FÖRST och alla
 * tester ska fortfarande passera – annars är förändringen sannolikt en
 * regression, inte en förbättring. Ersätter engångs-skript som kördes
 * manuellt under utvecklingen av v3/v4 med en permanent, upprepningsbar
 * kontroll.
 *
 * Varje test motsvarar antingen ett konkret buggfynd från granskningarna
 * som ledde fram till v3/v4, eller ett explicit edge case (A–L) från
 * v4-specen. Gränsvärdena är satta löst kring de faktiskt uppmätta
 * resultaten från den granskningen, inte exakta – modellen ska kunna
 * kalibreras om utan att varje enskilt tal måste matcha exakt, men
 * RIKTNINGEN och STORLEKSORDNINGEN på varje krav ska hålla.
 */

function shots(data: { total: number; sidled: number; direction?: "left" | "right" }[]): TeeShot[] {
  return data.map((d, i) => ({
    index: i + 1,
    total: d.total,
    sidled: Math.abs(d.sidled),
    direction: d.direction ?? (d.sidled < 0 ? "left" : "right"),
    filled: true,
  }));
}

function sixOf(total: number, sidled: number, direction?: "left" | "right"): TeeShot[] {
  return shots(Array.from({ length: 6 }, () => ({ total, sidled, direction })));
}

describe("Driving HCP v4 — grundläggande sanity", () => {
  it("mycket bra spelare (lång, rak) ger tydligt negativt/lågt HCP", () => {
    const r = offTeeResult(sixOf(250, 2));
    expect(r.handicap).toBeLessThan(0);
  });

  it("nybörjare (kort, vild, mycket OB) ger HCP nära taket", () => {
    const r = offTeeResult(sixOf(140, 45));
    expect(r.handicap).toBeGreaterThan(30);
  });

  it("tomt testresultat (inga registrerade slag) kraschar inte och ger 0", () => {
    const r = offTeeResult([]);
    expect(r.handicap).toBe(0);
    expect(r.score).toBe(0);
  });
});

describe("Driving HCP v4 — edge case C: extremt korta men raka slag", () => {
  it("6×50m/0m offline ska INTE bli bra (var ~19 i v3, ska nu vara nära taket)", () => {
    const r = offTeeResult(sixOf(50, 0));
    expect(r.handicap).toBeGreaterThan(30);
  });

  it("men extremt korta slag ska ändå gynnas av precision jämfört med vilda", () => {
    const straight = offTeeResult(sixOf(50, 0));
    const wild = offTeeResult(sixOf(50, 40));
    expect(straight.handicap).toBeLessThan(wild.handicap);
  });
});

describe("Driving HCP v4 — edge case L: extrema sidledsmissar", () => {
  it("6×300m/100m offline ska INTE bli hyggligt bra (var ~15-16 i v3, ska nu vara dåligt)", () => {
    const r = offTeeResult(sixOf(300, 100));
    expect(r.handicap).toBeGreaterThan(25);
  });

  it("100m offline ska straffas tydligt hårdare än 30m offline vid samma längd", () => {
    const moderate = offTeeResult(sixOf(290, 30));
    const extreme = offTeeResult(sixOf(290, 100));
    expect(extreme.handicap).toBeGreaterThan(moderate.handicap + 10);
  });
});

describe("Driving HCP v4 — kontinuitet, inget hopp vid fairwaykanten (28 m)", () => {
  it("27.9m och 28.1m offline ger nästan identiskt resultat", () => {
    const under = offTeeResult(sixOf(230, 27.9));
    const over = offTeeResult(sixOf(230, 28.1));
    expect(Math.abs(under.handicap - over.handicap)).toBeLessThan(1);
  });

  it("shotHandicap för ett enskilt slag är kontinuerlig kring 28m", () => {
    const a = shotHandicap({ total: 230, sidled: 27.9 });
    const b = shotHandicap({ total: 230, sidled: 28.1 });
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });
});

describe("Driving HCP v4 — bias vs dispersion (edge case D/E)", () => {
  it("stabil ensidig bias (+15m varje gång) är bättre än tvåvägsspridning (±15m) trots samma |sidled|", () => {
    const stableBias = offTeeResult(sixOf(250, 15, "right"));
    const twoWay = offTeeResult(
      shots([
        { total: 250, sidled: -15 },
        { total: 250, sidled: 16 },
        { total: 250, sidled: -14 },
        { total: 250, sidled: 15 },
        { total: 250, sidled: -17 },
        { total: 250, sidled: 14 },
      ]),
    );
    expect(stableBias.handicap).toBeLessThan(twoWay.handicap);
  });

  it("perfekt identiska slag ger noll dispersion, men bias räknas ändå", () => {
    const r = offTeeResult(sixOf(230, 12, "right"));
    expect(r.dispersion).toBeCloseTo(0, 1);
    expect(r.bias).toBeGreaterThan(0);
  });
});

describe("Driving HCP v4 — mishit/monsterdrive (edge case F/G)", () => {
  it("5 bra slag + 1 extrem mishit ger tydligt straff men ingen total kollaps", () => {
    const good = offTeeResult(sixOf(250, 3));
    const oneBad = offTeeResult(
      shots([
        { total: 250, sidled: 3 },
        { total: 248, sidled: 5 },
        { total: 252, sidled: 4 },
        { total: 249, sidled: 2 },
        { total: 251, sidled: 6 },
        { total: 80, sidled: 35 },
      ]),
    );
    expect(oneBad.handicap).toBeGreaterThan(good.handicap + 5);
    expect(oneBad.handicap).toBeLessThan(30);
  });

  it("5 dåliga slag + 1 monsterdrive räddar inte testet", () => {
    const r = offTeeResult(
      shots([
        { total: 160, sidled: 35 },
        { total: 155, sidled: 40 },
        { total: 150, sidled: 38 },
        { total: 158, sidled: 42 },
        { total: 152, sidled: 36 },
        { total: 290, sidled: 0 },
      ]),
    );
    expect(r.handicap).toBeGreaterThan(25);
  });
});

describe("Driving HCP v4 — kort men rak vs lång men vild (ordning bevarad)", () => {
  it("kort men perfekt rakt slag ska fortfarande vara bättre än långt men vilt slag", () => {
    const shortStraight = offTeeResult(
      shots([
        { total: 165, sidled: 1 },
        { total: 166, sidled: -1 },
        { total: 165, sidled: 1 },
        { total: 164, sidled: -1 },
        { total: 165, sidled: 1 },
        { total: 166, sidled: -1 },
      ]),
    );
    const longWild = offTeeResult(
      shots([
        { total: 240, sidled: 35 },
        { total: 245, sidled: 40 },
        { total: 238, sidled: 50 },
        { total: 250, sidled: 45 },
        { total: 242, sidled: 32 },
        { total: 248, sidled: 38 },
      ]),
    );
    expect(shortStraight.handicap).toBeLessThan(longWild.handicap);
  });

  it("180m/0m är klart sämre än en normal lång, rimligt rak drive (edge case K)", () => {
    const shortPerfect = offTeeResult(sixOf(180, 0));
    const normalLongDrive = offTeeResult(sixOf(235, 12));
    expect(shortPerfect.handicap).toBeGreaterThan(normalLongDrive.handicap + 5);
  });

  it("180m/0m är ändå bättre än 180m/30m (precision hjälper alltid, bara inte obegränsat)", () => {
    const straight = offTeeResult(sixOf(180, 0));
    const wild = offTeeResult(sixOf(180, 30));
    expect(straight.handicap).toBeLessThan(wild.handicap);
  });
});

describe("Driving HCP v4 — bakåtkompatibilitet med gammal data utan direction", () => {
  it("slag utan direction-fält kraschar inte och ger ett sammanhängande resultat", () => {
    const legacyShots: TeeShot[] = [
      { index: 1, total: 200, sidled: 20, filled: true },
      { index: 2, total: 195, sidled: 18, filled: true },
      { index: 3, total: 205, sidled: 22, filled: true },
      { index: 4, total: 198, sidled: 19, filled: true },
      { index: 5, total: 202, sidled: 21, filled: true },
      { index: 6, total: 199, sidled: 20, filled: true },
    ];
    const r = offTeeResult(legacyShots);
    expect(Number.isFinite(r.handicap)).toBe(true);
    expect(r.handicap).toBeGreaterThan(-8);
    expect(r.handicap).toBeLessThanOrEqual(40);
  });
});

describe("Driving HCP v4 — resultatet är alltid inom giltigt intervall", () => {
  it("handicap clampas alltid till [-8, 40]", () => {
    const best = offTeeResult(sixOf(320, 0));
    const worst = offTeeResult(sixOf(50, 100));
    expect(best.handicap).toBeGreaterThanOrEqual(-8);
    expect(worst.handicap).toBeLessThanOrEqual(40);
  });
});
