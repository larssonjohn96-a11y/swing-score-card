import { SG4Highlights } from "@/components/sg4-highlights";

const STEPS = [
  { title: "Testa ditt spel", text: "Börja med HCP-testerna för att kartlägga din nivå i varje kategori.", image: "/Off_the_tee.png", label: "Testa" },
  { title: "Upptäck styrkor och svagheter", text: "Se vilka delar av ditt spel som ligger före och efter i spindeldiagrammet.", image: "/Approach_shot.png", label: "Förstå" },
  { title: "Välj vad du ska förbättra först", text: "Välj ett fokus utifrån analysen och sätt ett tydligt nästa mål.", image: "/Putting_1.png", label: "Fokusera" },
  { title: "Jobba på ditt fokus", text: "Öva själv, spela eller ta hjälp av din tränare. Du väljer hur du utvecklar ditt spel.", image: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png", label: "Förbättra" },
  { title: "Testa igen. Se din utveckling.", text: "Jämför med tidigare resultat. Behåll ditt fokus eller välj nästa. Följ också om förbättringen märks på banan.", image: "/Approach_shot.png", label: "Följ upp" },
];

export function HandicapProcessStory() {
  return (
    <SG4Highlights
      id="handicap-process-heading"
      title="Hur sänker jag mitt HCP?"
      subtitle="Börja med HCP-testerna. Hitta ditt fokus och följ din utveckling – steg för steg."
      groups={[{
        label: "Sänk mitt HCP",
        image: "/Off_the_tee.png",
        stories: STEPS.map((step, index) => ({
          title: step.title,
          text: step.text,
          image: step.image,
          action: index === 0 ? "Gör HCP-tester" : index === 4 ? "Testa igen" : "Se min analys",
          href: index === 0 || index === 4 ? "/spela-runda" : "/utveckling",
        })),
      }]}
    />
  );
}
