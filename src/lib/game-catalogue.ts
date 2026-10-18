import { LEVEL_GAMES, distanceRange, type LevelGameId } from "@/lib/level-games";

/** Fristående spel – aldrig HCP-tester. */
const g = (id: LevelGameId) => {
  const d = LEVEL_GAMES[id];
  return { id, title: d.title, description: d.description, image: d.image,
    metadata: `${d.placementTargets.length} ${d.unit} · ${distanceRange(d.placementTargets)}` };
};

export const GAME_SECTIONS = [
  { title: "Utslag", subtitle: "Träffa fairwayen när den krymper", games: [{ id: "fairwaystegen" as const, title: "Fairwaystegen", description: "En träff, nästa nivå. Hur smalt klarar du med tre hjärtan?", image: "/Off_the_tee.png", metadata: "8 nivåer · 3 hjärtan · välj carry" }] },
  { title: "Puttning", subtitle: "Sänk korta, undvik treputt", games: [g("kortputt"), g("langputt")] },
  { title: "Närspel", subtitle: "Chipping & bunker", games: [g("chipping"), g("bunker")] },
  { title: "Inspel", subtitle: "Precision mot flaggan", games: [{ ...g("inspel"), title: "Flaggjakten", description: "Wedge eller järn. Samla nio stjärnor på varje HCP-utmaning.", metadata: "9 slag · 7 stjärnor klarar nivån" }] },
] as const;
