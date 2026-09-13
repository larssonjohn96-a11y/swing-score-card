export type BotPlayStyle = "conservative" | "balanced" | "aggressive";
export type BotTemperament = "calm" | "streaky" | "competitive" | "ice-cold";
export type BotCommunication = "warm" | "social" | "cocky" | "focused" | "terse";

export type BotArchetype = {
  label: string;
  playStyle: BotPlayStyle;
  temperament: BotTemperament;
  communication: BotCommunication;
  aggression: number;
  consistency: number;
  clutch: number;
  traits: string[];
};

export function archetypeLabels(archetype: BotArchetype) {
  const style = archetype.playStyle === "aggressive" ? "Aggressiv" : archetype.playStyle === "conservative" ? "Försiktig" : "Balanserad";
  const temperament = archetype.temperament === "ice-cold" ? "Iskall" : archetype.temperament === "competitive" ? "Tävlingsinriktad" : archetype.temperament === "streaky" ? "Ojämn" : "Lugn";
  return [style, temperament, ...archetype.traits.slice(0, 1)];
}

export function effectiveCategoryHcp(categoryHcp: number, archetype: BotArchetype, lateMatch: boolean) {
  if (!lateMatch) return categoryHcp;
  const pressureAdjustment = (0.5 - archetype.clutch) * 4;
  return categoryHcp + pressureAdjustment;
}
