import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { GREEN_READING_OPTIONS, GREEN_READING_PROMPTS, analyzeGreenReading } from "@/lib/training/tests";

export const Route = createFileRoute("/green-reading")({
  head: () => ({
    meta: [
      { title: "Green Reading Test | SG4" },
      {
        name: "description",
        content:
          "Tio puttar där du bedömer läsning och startlinje, inte bara om putten går i. Träningstest utan handicap.",
      },
      { property: "og:title", content: "Green Reading Test | SG4" },
      { property: "og:description", content: "Isolera din greenläsning och följ utvecklingen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GreenReadingPage,
});

function GreenReadingPage() {
  return (
    <ScoredTest
      testId="green-reading"
      eyebrow="Putting · Träningstest"
      title="Green Reading"
      intro="Läs brytningen, sikta och bedöm sedan slaget: rätt läsning och startlinje, delvis rätt, eller fel. Testet mäter läsningen – inte om putten föll."
      backTo="/traning"
      selfTo="/green-reading"
      historyTo="/green-reading-historik"
      prompts={GREEN_READING_PROMPTS}
      options={GREEN_READING_OPTIONS}
      optionCols={3}
      runningLabel="Poäng hittills"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Puttar", value: "10" },
            { label: "Poäng per putt", value: "0–2" },
            { label: "Max", value: "20 poäng" },
          ],
          note: "Välj puttar med tydlig brytning från olika håll runt hålet.",
        },
      ]}
      analyze={analyzeGreenReading}
    />
  );
}
