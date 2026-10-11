import { createFileRoute, notFound } from "@tanstack/react-router";
import { LevelGamePlay } from "@/components/level-game-play";
import { LEVEL_GAMES, isLevelGameId } from "@/lib/level-games";

export const Route = createFileRoute("/spel/$gameId")({
  loader: ({ params }) => {
    if (!isLevelGameId(params.gameId)) throw notFound();
    return { gameId: params.gameId };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Spel saknas | SG4" }, { name: "robots", content: "noindex" }] };
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
  return <LevelGamePlay key={gameId} gameId={gameId} />;
}
