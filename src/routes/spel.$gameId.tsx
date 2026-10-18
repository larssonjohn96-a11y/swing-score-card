import { ApproachStarGame } from "@/components/approach-star-game";
import { FairwayLadder } from "@/components/fairway-ladder";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { LevelGamePlay } from "@/components/level-game-play";
import { LEVEL_GAMES, isLevelGameId } from "@/lib/level-games";

export const Route = createFileRoute("/spel/$gameId")({
  loader: ({ params }) => {
    if (params.gameId === "fairwaystegen") return { gameId: "fairwaystegen" as const };
    if (!isLevelGameId(params.gameId)) throw notFound();
    return { gameId: params.gameId };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Spel saknas | SG4" }, { name: "robots", content: "noindex" }] };
    if (loaderData.gameId === "fairwaystegen") return { meta: [{ title: "Fairwaystegen – Driver | SG4" }, { name: "description", content: "Åtta krympande fairways, tre hjärtan och rekord per carrylängd." }] };
    if (loaderData.gameId === "inspel") return { meta: [{ title: "Flaggjakten – HCP-utmaningar | SG4" }] };
    const g = LEVEL_GAMES[loaderData.gameId];
    const title = `${g.title} – Level Challenge | SG4`;
    return { meta: [
      { title }, { name: "description", content: g.description },
      { property: "og:title", content: title }, { property: "og:description", content: g.description },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  notFoundComponent: () => <p className="p-6">Spelet finns inte.</p>,
  component: GamePage,
});

function GamePage() {
  const { gameId } = Route.useLoaderData();
  if (gameId === "fairwaystegen") return <FairwayLadder />;
  if (gameId === "inspel") return <ApproachStarGame />;
  return <LevelGamePlay key={gameId} gameId={gameId} />;
}
