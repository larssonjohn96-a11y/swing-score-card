/**
 * Riktiga vänner (till skillnad från lib/friends.ts, som är manuellt
 * inskrivna namn+handicap utan koppling till ett konto).
 *
 * Delar bara det FÄRDIGBERÄKNADE spelarkortet (rating, tier, HCP per
 * kategori) – inte rå slagdata – och bara med användare man har en
 * ömsesidigt accepterad vänskap med. Kräver att personen är inloggad.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  loadRealHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";
import { computeRatingCard, type RatingCardData } from "@/lib/rating-card";

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  /** motpartens profil (den andra parten, inte den inloggade användaren) */
  other: Profile;
};

export type PlayerSnapshot = {
  userId: string;
  rating: number;
  tierKey: string;
  realHcp: number | null;
  estHcp: number | null;
  categoryHcp: Partial<Record<CategorySlug, number>>;
  testCount: number;
  updatedAt: string;
};

/** Sök bland andra användares profiler (namn), för att skicka en vänförfrågan. */
export async function searchProfiles(query: string, excludeSelf = true): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data: userData } = await supabase.auth.getUser();
  let q = supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${trimmed}%`)
    .limit(20);
  if (excludeSelf && userData.user) q = q.neq("id", userData.user.id);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((p) => ({ id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url }));
}

/** Skickar en vänförfrågan. Ignorerar tyst om den redan finns (unik-constraint i databasen). */
export async function sendFriendRequest(addresseeId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userData.user.id, addressee_id: addresseeId });
  return !error;
}

export async function respondToFriendRequest(id: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function removeFriendship(id: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  return !error;
}

/** Alla vänskapsrader (väntande in/ut, accepterade) med motpartens profil ifylld. */
export async function listFriendships(): Promise<{
  incoming: Friendship[];
  outgoing: Friendship[];
  accepted: Friendship[];
}> {
  const empty = { incoming: [], outgoing: [], accepted: [] };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return empty;
  const uid = userData.user.id;

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
  if (error || !rows || !rows.length) return empty;

  const otherIds = [
    ...new Set(rows.map((r) => (r.requester_id === uid ? r.addressee_id : r.requester_id))),
  ];
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", otherIds);
  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id,
      { id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url },
    ]),
  );

  const incoming: Friendship[] = [];
  const outgoing: Friendship[] = [];
  const accepted: Friendship[] = [];

  for (const r of rows) {
    const otherId = r.requester_id === uid ? r.addressee_id : r.requester_id;
    const other = profileById.get(otherId);
    if (!other) continue;
    const friendship: Friendship = {
      id: r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status: r.status as FriendshipStatus,
      createdAt: r.created_at,
      other,
    };
    if (r.status === "accepted") accepted.push(friendship);
    else if (r.status === "pending" && r.addressee_id === uid) incoming.push(friendship);
    else if (r.status === "pending" && r.requester_id === uid) outgoing.push(friendship);
  }

  return { incoming, outgoing, accepted };
}

/** Räknar fram spelarkortet lokalt precis som PlayerCard gör, och sparar (upsert) i molnet. */
export async function pushPlayerSnapshot(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const real = loadRealHandicap();
  const card: RatingCardData = computeRatingCard(real);
  const cats = computeCategoryHandicaps();
  const byCat = (slug: CategorySlug) => cats.find((c) => c.slug === slug)?.handicap ?? null;

  await supabase.from("player_snapshots").upsert({
    user_id: userData.user.id,
    rating: card.rating,
    tier_key: card.tier.key,
    real_hcp: real,
    est_hcp: computeEstimatedHandicap(cats) ?? null,
    approach_hcp: byCat("approach"),
    driving_hcp: byCat("driving"),
    around_green_hcp: byCat("around-the-green"),
    putting_hcp: byCat("puttning"),
    speed_hcp: byCat("speed"),
    test_count: cats.reduce((sum, c) => sum + c.count, 0),
    updated_at: new Date().toISOString(),
  });
}

/** Hämtar en väns spelarkorts-ögonblicksbild. RLS ser till att det bara funkar för
 *  accepterade vänner (annars kommer raden inte tillbaka alls). */
export async function fetchFriendSnapshot(userId: string): Promise<PlayerSnapshot | null> {
  const { data, error } = await supabase
    .from("player_snapshots")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: data.user_id,
    rating: data.rating,
    tierKey: data.tier_key,
    realHcp: data.real_hcp,
    estHcp: data.est_hcp,
    categoryHcp: {
      approach: data.approach_hcp ?? undefined,
      driving: data.driving_hcp ?? undefined,
      "around-the-green": data.around_green_hcp ?? undefined,
      puttning: data.putting_hcp ?? undefined,
      speed: data.speed_hcp ?? undefined,
    },
    testCount: data.test_count,
    updatedAt: data.updated_at,
  };
}
