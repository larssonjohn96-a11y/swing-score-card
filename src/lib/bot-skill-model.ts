import type { BotArchetype } from "@/lib/bot-archetypes";

export type BotCategoryHandicaps = {
  putting: number;
  chipping: number;
  approach: number;
  driving: number;
};

export type ChipStrike = "holed" | "excellent" | "solid" | "duff" | "thin";

export type ChipBotResult = {
  points: 0 | 1 | 2 | 3 | 4 | 5;
  proximity: number;
  strike: ChipStrike;
  description: string;
};

export type DriveBotResult = {
  hit: boolean;
  carry: number;
  strike: "solid" | "poor" | "top" | "wild";
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundedTenth(n: number) {
  return Math.round(n * 10) / 10;
}

function styleValue(archetype: BotArchetype | undefined, key: "aggression" | "consistency") {
  return archetype?.[key] ?? 0.5;
}

function chipPointsFromProximity(proximity: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (proximity <= 0.08) return 5;
  if (proximity <= 1) return 4;
  if (proximity <= 2) return 3;
  if (proximity <= 3) return 2;
  if (proximity <= 5) return 1;
  return 0;
}

export function simulateChipBotResult(distance: number, categoryHcp: number, random = Math.random, archetype?: BotArchetype): ChipBotResult {
  const hcp = Math.max(-8, categoryHcp);
  const positiveHcp = Math.max(0, hcp);
  const aggression = styleValue(archetype, "aggression");
  const consistency = styleValue(archetype, "consistency");
  const styleDisaster = 1 + (aggression - 0.5) * 0.38 - (consistency - 0.5) * 0.5;
  const disasterChance = clamp((0.015 + positiveHcp * 0.0065 + Math.max(0, distance - 12) * 0.0035) * styleDisaster, 0.008, 0.38);
  if (random() < disasterChance) {
    const thin = random() < 0.46 + (aggression - 0.5) * 0.18;
    if (thin) {
      const overshoot = 5 + random() * (7 + positiveHcp * 0.16 + distance * 0.12 + aggression * 3);
      const proximity = roundedTenth(overshoot);
      return { points: chipPointsFromProximity(proximity), proximity, strike: "thin", description: `Tunn · ${proximity.toFixed(1)} m förbi` };
    }
    const travelled = Math.max(0.5, distance * (0.08 + random() * (0.24 + clamp(positiveHcp / 90, 0, 0.28))));
    const proximity = roundedTenth(Math.max(0.3, distance - travelled));
    return { points: chipPointsFromProximity(proximity), proximity, strike: "duff", description: `Duff · ${proximity.toFixed(1)} m kvar` };
  }
  const holeChance = clamp((0.012 - positiveHcp * 0.00025 - Math.max(0, distance - 8) * 0.00018) * (0.9 + aggression * 0.2), 0.0004, 0.02);
  if (random() < holeChance) return { points: 5, proximity: 0, strike: "holed", description: "Sänkt" };
  const excellentChance = clamp((0.19 - positiveHcp * 0.0048 - Math.max(0, distance - 8) * 0.0036) * (0.9 + aggression * 0.18 + consistency * 0.08), 0.008, 0.22);
  if (random() < excellentChance) {
    const proximity = roundedTenth(0.18 + random() * 0.78);
    return { points: chipPointsFromProximity(proximity), proximity, strike: "excellent", description: `${proximity.toFixed(1)} m från hålet` };
  }
  const typical = 0.55 + distance * 0.052 + positiveHcp * 0.052;
  const variability = (0.55 + random() * (1.5 + positiveHcp * 0.012)) * (1.08 - consistency * 0.16);
  const proximity = roundedTenth(clamp(typical * variability, 0.25, Math.max(6, distance * 0.9)));
  return { points: chipPointsFromProximity(proximity), proximity, strike: "solid", description: `${proximity.toFixed(1)} m från hålet` };
}

function puttingBaseMakeChance(distance: number) {
  if (distance <= 1) return 0.96;
  if (distance <= 1.5) return 0.84;
  if (distance <= 2) return 0.68;
  if (distance <= 3) return 0.43;
  if (distance <= 4) return 0.29;
  if (distance <= 5) return 0.21;
  if (distance <= 7) return 0.12;
  if (distance <= 10) return 0.065;
  if (distance <= 15) return 0.03;
  return 0.018;
}

export function simulatePuttingBotStrokes(distance: number, categoryHcp: number, random = Math.random, archetype?: BotArchetype) {
  const positiveHcp = Math.max(0, categoryHcp);
  const consistency = styleValue(archetype, "consistency");
  const makeAdjustment = clamp(1 - positiveHcp * 0.0105, 0.5, 1.12);
  const makeChance = clamp(puttingBaseMakeChance(distance) * makeAdjustment * (0.96 + consistency * 0.08), 0.008, 0.985);
  if (random() < makeChance) return 1;
  const threePuttChance = clamp((0.008 + Math.max(0, distance - 2.5) * 0.018 + positiveHcp * 0.0028) * (1.12 - consistency * 0.24), 0.01, 0.58);
  const fourPuttChance = clamp((Math.max(0, distance - 7) * 0.004 + Math.max(0, positiveHcp - 18) * 0.0015) * (1.12 - consistency * 0.24), 0, 0.14);
  const missRoll = random();
  if (missRoll < fourPuttChance) return 4;
  if (missRoll < fourPuttChance + threePuttChance) return 3;
  return 2;
}

export function simulateDriveBotResult(categoryHcp: number, random = Math.random, archetype?: BotArchetype): DriveBotResult {
  const positiveHcp = Math.max(0, categoryHcp);
  const aggression = styleValue(archetype, "aggression");
  const consistency = styleValue(archetype, "consistency");
  const disasterChance = clamp((0.018 + positiveHcp * 0.0055) * (0.84 + aggression * 0.42 - consistency * 0.18), 0.008, 0.3);
  if (random() < disasterChance) {
    const top = random() < 0.52 - aggression * 0.08;
    return { hit: false, carry: Math.round(top ? 65 + random() * (90 + positiveHcp) : 130 + random() * 65), strike: top ? "top" : "wild" };
  }
  const fairwayChance = clamp(0.74 - positiveHcp * 0.0105 - aggression * 0.09 + consistency * 0.08, 0.24, 0.82);
  const hit = random() < fairwayChance;
  const baseCarry = 258 - positiveHcp * 1.45 + aggression * 20;
  const spread = (8 + positiveHcp * 0.35) * (1.12 - consistency * 0.24);
  const carry = Math.round(clamp(baseCarry + (random() - 0.5) * spread * 2, 110, 295));
  return { hit, carry, strike: hit ? "solid" : "poor" };
}
