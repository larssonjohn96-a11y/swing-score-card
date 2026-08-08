import type { CategorySlug } from "@/lib/sg-handicap";

/**
 * Öppna referensprofiler ("kändisprofiler") – kuraterade exempel som alla
 * kan jämföra sig mot direkt, utan vänförfrågan och utan att databasen
 * behöver vara synkad. Fristående från de riktiga molnvännerna
 * (friends-cloud.ts) och de manuellt inskrivna kompisarna (friends.ts).
 */
export type OpenProfile = {
  id: string;
  name: string;
  /** kort badge-text, t.ex. klubb eller titel */
  subtitle?: string;
  hcp: number;
  categoryHcp: Record<CategorySlug, number>;
  /** initialer som visas som en enkel "profilbild" tills ett riktigt foto finns */
  initials: string;
  /** blå bock, som en verifierad profil på sociala medier */
  verified?: boolean;
  /** guldram + guld bock istället för blå – för framtida betalprofiler */
  premium?: boolean;
};

export const OPEN_PROFILES: OpenProfile[] = [
  {
    id: "open-pete-stoneridge",
    name: "Pete Stoneridge",
    subtitle: "Referensprofil",
    hcp: 5,
    categoryHcp: {
      approach: 4,
      driving: 3,
      "around-the-green": 6,
      puttning: 5.5,
      speed: 2,
    },
    initials: "PS",
    verified: true,
  },
];

export function searchOpenProfiles(query: string): OpenProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return OPEN_PROFILES;
  return OPEN_PROFILES.filter((p) => p.name.toLowerCase().includes(q));
}
