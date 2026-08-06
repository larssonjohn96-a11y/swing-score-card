import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadSpeedSessions } from "@/lib/speed";
import { SpeedLanding } from "@/components/speed-landing";

export const Route = createFileRoute("/speed-test")({
  head: () => ({
    meta: [
      { title: "Speed Test – Golfträning" },
      {
        name: "description",
        content:
          "Speed HCP, snitt- och toppfart samt smash factor efter 6 drives, mätt i simulator eller på range.",
      },
      { property: "og:title", content: "Speed Test – Golfträning" },
      {
        property: "og:description",
        content: "Mät din bollhastighet och se var du ligger jämfört med andra handicapnivåer.",
      },
    ],
  }),
  component: SpeedTestLanding,
});

function SpeedTestLanding() {
  const [lastResultLabel, setLastResultLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessions = loadSpeedSessions();
    const last = sessions[sessions.length - 1];
    setLastResultLabel(
      last ? `Ditt senaste resultat: ${last.avgBallSpeed.toFixed(0)} mph i snitt` : undefined,
    );
  }, []);

  return <SpeedLanding lastResultLabel={lastResultLabel} />;
}
