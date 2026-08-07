import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { handicapLabel, loadShortGameSessions } from "@/lib/shortgame";
import { ShortGameLanding } from "@/components/shortgame-landing";

export const Route = createFileRoute("/narspel-test")({
  head: () => ({
    meta: [
      { title: "Närspelstest – Golfträning" },
      {
        name: "description",
        content:
          "6 slag från 8 till 20 meter, fri teknik. Närspel HCP, snittavstånd och spridningsbild efter testet.",
      },
      { property: "og:title", content: "Närspelstest – Golfträning" },
      {
        property: "og:description",
        content: "Mät din faktiska prestation runt green – oavsett teknik.",
      },
    ],
  }),
  component: ShortGameTestLanding,
});

function ShortGameTestLanding() {
  const [lastResultLabel, setLastResultLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessions = loadShortGameSessions();
    const last = sessions[sessions.length - 1];
    setLastResultLabel(
      last
        ? `Ditt senaste resultat: HCP ${handicapLabel(last.handicap)} · ${last.avgProximity.toFixed(2)} m i snitt`
        : undefined,
    );
  }, []);

  return <ShortGameLanding lastResultLabel={lastResultLabel} />;
}
