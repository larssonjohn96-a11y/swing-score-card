import { createFileRoute } from "@tanstack/react-router";
import { ShotShapingAnalysis } from "@/components/training/shot-shaping-analysis";

export const Route = createFileRoute("/shot-shaping-vaxlande-historik")({
  head: () => ({
    meta: [
      { title: "Shot Shaping – Analys | SG4" },
      { name: "description", content: "Samlad analys av Växlande shape, Konstant shape och 9 Window Drill." },
    ],
  }),
  component: ShotShapingAnalysis,
});
