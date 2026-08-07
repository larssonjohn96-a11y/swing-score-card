import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { handicapLabel, loadBunkerSessions } from "@/lib/bunker";
import { BunkerLanding } from "@/components/bunker-landing";

export const Route = createFileRoute("/bunker-test")({
  head: () => ({
    meta: [
      { title: "Bunkerslag – Golfträning" },
      {
        name: "description",
        content:
          "6 bunkerslag från de vanligaste lägena. Bunker HCP, snittavstånd från hål och svagaste läge efter testet.",
      },
      { property: "og:title", content: "Bunkerslag – Golfträning" },
      {
        property: "og:description",
        content: "Mät hur nära hålet du får bollen ur bunkern – och hur ofta du kommer upp.",
      },
    ],
  }),
  component: BunkerTestLanding,
});

function BunkerTestLanding() {
  const [lastResultLabel, setLastResultLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessions = loadBunkerSessions();
    const last = sessions[sessions.length - 1];
    setLastResultLabel(
      last
        ? `Ditt senaste resultat: HCP ${handicapLabel(last.handicap)} · ${last.avgProximity.toFixed(2)} m i snitt`
        : undefined,
    );
  }, []);

  return <BunkerLanding lastResultLabel={lastResultLabel} />;
}
