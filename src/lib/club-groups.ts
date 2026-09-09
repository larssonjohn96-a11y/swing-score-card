export const CLUB_GROUPS = [
  { title: "Putter", clubs: ["Putter"] },
  { title: "Woods", clubs: ["Driver", "Mini Driver", "2W", "3W", "4W", "5W", "7W", "9W", "11W"] },
  { title: "Hybrids", clubs: ["2H", "3H", "4H", "5H", "6H", "7H"] },
  { title: "Irons", clubs: ["Driving Iron", "1i", "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i"] },
  { title: "Wedges", clubs: ["PW", "AW", "GW", "SW", "LW", "46°", "48°", "50°", "52°", "54°", "56°", "58°", "60°", "62°", "64°"] },
] as const;

export const TEMPERATURE_VALUES = Array.from({ length: 61 }, (_, index) => index - 10);
export const ELEVATION_VALUES = Array.from({ length: 111 }, (_, index) => -500 + index * 50);
