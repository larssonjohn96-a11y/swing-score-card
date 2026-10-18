/** Only the completed standalone games are promoted in the games catalogue. */
export const GAME_SECTIONS = [
  { title: "Inspel", games: [{ id: "inspel", title: "Flaggjakten", image: "/Approach_shot.png" }] },
  {
    title: "Utslag",
    games: [{ id: "fairwaystegen", title: "Fairwaystegen", image: "/Off_the_tee.png" }],
  },
] as const;
