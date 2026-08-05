import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { ShortPuttingLanding } from "@/components/shortputt-landing";

export const Route = createFileRoute("/short-putting-test")({
  head: () => ({
    meta: [
      { title: "Short Putting Test – Golfträning" },
      {
        name: "description",
        content:
          "Short Putting Score 0–100, uppskattat HCP-intervall och analys per avstånd och riktning efter 24 puttar (2 varv).",
      },
      { property: "og:title", content: "Short Putting Test – Golfträning" },
      {
        property: "og:description",
        content: "24 puttar (2 varv) från fyra riktningar runt hålet, 1 till 3 meter.",
      },
    ],
  }),
  component: ShortPuttingTestLanding,
});

function ShortPuttingTestLanding() {
  const [lastResultLabel, setLastResultLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessions = loadShortPuttSessions();
    const last = sessions[sessions.length - 1];
    setLastResultLabel(last ? `Ditt senaste resultat: ${last.score.toFixed(0)} / 100` : undefined);
  }, []);

  return <ShortPuttingLanding lastResultLabel={lastResultLabel} />;
}
