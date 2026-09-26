import { SG4Highlights, type HighlightGroup } from "@/components/sg4-highlights";

const PROCESS_GROUPS: HighlightGroup[] = [{
  label: "Sänk mitt HCP",
  cover: "progress",
  stories: [
    { title: "Börja med HCP-testerna", text: "Testa ditt spel och kartlägg din nivå i varje kategori.", art: "hcp", action: "Gör HCP-tester", href: "/spela-runda" },
    { title: "Se styrkor och svagheter", text: "Spindeldiagrammet visar vilka delar av ditt spel som ligger före och efter.", art: "focus", action: "Se min analys", href: "/utveckling" },
    { title: "Välj ett fokus", text: "Utgå från analysen. Välj vad du vill förbättra först och sätt ett tydligt mål.", art: "target", action: "Se min analys", href: "/utveckling" },
    { title: "Träna på ditt fokus", text: "Öva själv, spela eller ta hjälp av din tränare. Du väljer hur du utvecklar ditt spel.", art: "practice", action: "Se min analys", href: "/utveckling" },
    { title: "Testa igen. Se skillnaden.", text: "Jämför resultaten och välj nästa fokus. Följ också om förbättringen märks på banan.", art: "progress", action: "Testa igen", href: "/spela-runda" },
  ],
}];

export function HandicapProcessStory() {
  return (
    <SG4Highlights
      id="handicap-process-heading"
      title="Hur sänker jag mitt HCP?"
      subtitle="Börja med HCP-testerna. Hitta ditt fokus och följ din utveckling – steg för steg."
      groups={PROCESS_GROUPS}
    />
  );
}
