import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";

export const Route = createFileRoute("/driver-konsekvens-historik")({
  head: () => ({ meta: [{ title: "Driver med konsekvens – Progress | SG4" }] }),
  component: () => (
    <TestHistory
      testId="driver-konsekvens"
      title="Driver med konsekvens"
      testTo="/driver-konsekvens"
      valueLabel="Totalpoäng"
      valueSuffix="p"
      higherIsBetter
      scaleHint="16 drives"
    />
  ),
});
