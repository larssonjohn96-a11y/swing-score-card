import { LEVEL_GAMES, distanceRange, type LevelGameId } from "@/lib/level-games";

/** Fem fristående Level Challenges – aldrig HCP-tester. */
const g = (id: LevelGameId) => {
  const d = LEVEL_GAMES[id];
  return { id, title: d.title, description: d.description, image: d.image,
    metadata: `${d.placementTargets.length} ${d.unit} · ${distanceRange(d.placementTargets)}` };
};

export const GAME_SECTIONS = [
  { title: "Puttning", subtitle: "Sänk korta, undvik treputt", games: [g("kortputt"), g("langputt")] },
  { title: "Närspel", subtitle: "Chipping & bunker", games: [g("chipping"), g("bunker")] },
  { title: "Inspel", subtitle: "Precision mot flaggan", games: [g("inspel")] },
] as const;
