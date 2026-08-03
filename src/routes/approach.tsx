import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { ApproachLanding } from "@/components/approach-landing";

export const Route = createFileRoute("/approach")({
  head: () => ({
    meta: [
      { title: "Approach Test – Golfträning" },
      {
        name: "description",
        content:
          "Approach Score 0–100, uppskattad handicapnivå, spridningskarta och personlig analys efter 18 inspel.",
      },
      { property: "og:title", content: "Approach Test – Golfträning" },
      {
        property: "og:description",
        content: "Se exakt hur nära flaggan du landar och upptäck mönstren bakom dina inspel.",
      },
    ],
  }),
  component: ApproachTestLanding,
});

function ApproachTestLanding() {
  const [lastResultLabel, setLastResultLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessions = loadPrecisionSessions();
    const last = sessions[sessions.length - 1];
    setLastResultLabel(
      last?.score !== undefined
        ? `Ditt senaste resultat: ${last.score.toFixed(0)} / 100`
        : undefined,
    );
  }, []);

  return <ApproachLanding lastResultLabel={lastResultLabel} />;
}
