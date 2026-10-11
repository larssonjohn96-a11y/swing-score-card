import { createFileRoute } from "@tanstack/react-router";
import { GameOverview } from "@/components/game-overview";

export const Route = createFileRoute("/spel/")({
  head: () => ({ meta: [
    { title: "Spel – Rekord & golfutmaningar | SG4" },
    { name: "description", content: "Spela fem utmaningar med nivå 1–5: kortputtning, långputtning, chipping, bunker och inspel." },
    { property: "og:title", content: "Spel – Rekord & golfutmaningar | SG4" },
    { property: "og:description", content: "Utvecklas genom att spela, slå rekord och utmana vänner." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: GameOverview,
});