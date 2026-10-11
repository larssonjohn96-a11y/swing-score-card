/** These formats do not yet have matching standalone game routes. Never link them to HCP assessments. */
export const GAME_SECTIONS = [
  { title: "Puttning", subtitle: "Scoring & längdkontroll", games: [
    { title: "Par 18", description: "Spela nio hål och jaga ditt bästa resultat.", metadata: "9 hål · par 18", image: "/Putting_1.png" },
    { title: "No 3-Putt Streak", description: "Hur många hål klarar du utan en treputt?", metadata: "Obegränsat · ingen treputt", image: "/putting-card.jpg" },
  ] },
  { title: "Inspel", subtitle: "Precision mot green", games: [
    { title: "Approach Round", description: "Nio mål. Träffa nära och slå ditt rekord.", metadata: "9 mål", image: "/Approach_shot.png" },
  ] },
  { title: "Närspel", subtitle: "Avstånd & bollkontroll", games: [
    { title: "Chip Round", description: "Tre bollar per hål med varierade avstånd.", metadata: "6 hål × 3 bollar · 18 chippar", image: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png" },
  ] },
  { title: "Utslag", subtitle: "Precision från tee", games: [
    { title: "Tee Round", description: "Nio utslag. Hitta fairway och sätt nytt rekord.", metadata: "9 utslag", image: "/Off_the_tee.png" },
  ] },
] as const;