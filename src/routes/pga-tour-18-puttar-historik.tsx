import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";

export const Route = createFileRoute("/pga-tour-18-puttar-historik")({
  head: () => ({
    meta: [
      { title: "PGA Tour – 18 Puttar · Progress | SG4" },
      { name: "description", content: "Följ ditt totala antal puttar i PGA Tour 18-puttstestet över tid." },
    ],
  }),
  component: () => (
    <TestHistory
      testId="pga-tour-18-puttar"
      title="PGA Tour – 18 Puttar"
      testTo="/pga-tour-18-puttar"
      valueLabel="Totala puttar"
      valueSuffix="puttar"
      higherIsBetter={false}
      scaleHint="PGA Tour snitt 29,2"
    />
  ),
});
